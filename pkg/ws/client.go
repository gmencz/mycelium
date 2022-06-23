package ws

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gmencz/mycelium/pkg/common"
	"github.com/gmencz/mycelium/pkg/models"
	"github.com/go-redis/redis/v9"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	"golang.org/x/exp/slices"
	"gorm.io/gorm"
)

type Client struct {
	hub          *Hub
	sessionID    string
	Ws           *websocket.Conn
	apiKeyID     string
	appID        string
	capabilities map[string]string
	channels     []string
}

const (
	// Time allowed to read the next pong message from the client.
	pongWait = 60 * time.Second

	// Send pings to the client with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer (1MB).
	maxMessageSize = 1048576

	// Maximum channels a client can subscribe to
	maxChannels = 500
)

// newClient tries to authenticate the connection and returns a new client if successful.
func newClient(request *http.Request, ws *websocket.Conn, db *gorm.DB, hub *Hub) (c *Client, closeMessage []byte) {
	key := request.URL.Query().Get("key")
	token := request.URL.Query().Get("token")

	if key == "" && token == "" {
		return nil, websocket.FormatCloseMessage(4001, "provide either a key or a token")
	}

	if key != "" && token != "" {
		return nil, websocket.FormatCloseMessage(4001, "provide either a key or a token and NOT both")
	}

	var capabilities map[string]string
	var apiKey models.ApiKey

	if key != "" {
		if result := db.First(&apiKey, "id = ?", key); result.Error != nil {
			return nil, websocket.FormatCloseMessage(4001, "invalid key")
		}

		result, err := apiKey.Capabilities.MarshalJSON()
		if err != nil {
			return nil, websocket.FormatCloseMessage(4005, "internal server error")
		}

		if err := json.Unmarshal(result, &capabilities); err != nil {
			return nil, websocket.FormatCloseMessage(4001, "invalid key capabilities")
		}
	} else {
		parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
			// Don't forget to validate the alg is what you expect:
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("invalid token, unexpected signing method")
			}

			kid := token.Header["kid"]
			if kid == nil {
				return nil, errors.New("invalid token, missing kid header")
			}

			if result := db.First(&apiKey, "id = ?", kid); result.Error != nil {
				return nil, errors.New("invalid token kid header")
			}

			return []byte(apiKey.Secret), nil
		})

		if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok && parsedToken.Valid {
			jwtCapabilities, ok := claims["x-mycelium-capabilities"].(map[string]string)
			if jwtCapabilities != nil && !ok {
				return nil, websocket.FormatCloseMessage(4005, "invalid claim x-mycelium-capabilities")
			}

			if jwtCapabilities == nil {
				result, err := apiKey.Capabilities.MarshalJSON()
				if err != nil {
					return nil, websocket.FormatCloseMessage(4005, "server error")
				}

				if err := json.Unmarshal(result, &capabilities); err != nil {
					return nil, websocket.FormatCloseMessage(4001, "invalid key capabilities")
				}
			} else {
				capabilities = jwtCapabilities
			}
		} else {
			return nil, websocket.FormatCloseMessage(4001, err.Error())
		}
	}

	return &Client{
		sessionID:    uuid.NewString(),
		Ws:           ws,
		apiKeyID:     apiKey.ID,
		appID:        apiKey.AppID,
		capabilities: capabilities,
		hub:          hub,
		channels:     make([]string, 0),
	}, nil
}

func (c *Client) startSession() {
	c.hub.register <- c
	c.Ws.SetReadLimit(maxMessageSize)
	c.Ws.SetReadDeadline(time.Now().Add(pongWait))
	c.Ws.SetPongHandler(func(string) error { c.Ws.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
	c.Ws.WriteJSON(newHelloMessage(c.sessionID))
}

func (c *Client) ping() {
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		c.hub.unregister <- c
		ticker.Stop()
		c.Ws.Close()
	}()

	for range ticker.C {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteMessage(websocket.PingMessage, nil)
	}
}

func (c *Client) hasCapability(capability string, channel string, capabilities map[string]string) bool {
	starCapabilities, hasStarCapabilities := capabilities["*"]
	if hasStarCapabilities {
		s := strings.Split(starCapabilities, ",")
		return (slices.Contains(s, "*") || slices.Contains(s, capability))
	}

	channelCapabilities, hasChannelCapabilities := capabilities[channel]
	if hasChannelCapabilities {
		s := strings.Split(channelCapabilities, ",")
		return (slices.Contains(s, "*") || slices.Contains(s, capability))
	}

	return false
}

func (c *Client) subscribe(data interface{}, rdb *redis.Client) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeSubscribeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", typeSubscribe),
		})

		return
	}

	d := subscribeMessageData{}
	if err := json.Unmarshal(jsonData, &d); err != nil {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeSubscribeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", typeSubscribe),
		})

		return
	}

	appChannel := c.appID + ":" + d.Channel
	if !validateChannelName(d.Channel) {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeSubscribeError,
			Reason: fmt.Sprintf("invalid 'channel' for mesage of type '%v'", typeSubscribe),
		})

		return
	}

	isAlreadySubscribed := slices.Contains(c.channels, appChannel)
	if isAlreadySubscribed {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeSubscribeError,
			Reason: fmt.Sprintf("you're already subscribed to the channel %s", d.Channel),
		})

		return
	}

	if len(c.channels) > maxChannels {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeSubscribeError,
			Reason: fmt.Sprintf("you can't subscribe to more than %v channels", maxChannels),
		})

		return
	}

	if !c.hasCapability(string(typeSubscribe), d.Channel, c.capabilities) {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeSubscribeError,
			Reason: fmt.Sprintf("you're not allowed to subscribe to the channel %s", d.Channel),
		})

		return
	}

	c.channels = append(c.channels, appChannel)
	c.hub.subscribe <- &hubSubscription{client: c, channel: appChannel}
	rdb.Incr(ctx, "subscribers:"+appChannel)
	c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
	c.Ws.WriteJSON(newSubscribeSuccessMessage(d.Channel))
}

func (c *Client) unsubscribe(data interface{}, rdb *redis.Client) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeUnsubscribeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", typeUnsubscribe),
		})

		return
	}

	d := unsubscribeMessageData{}
	if err := json.Unmarshal(jsonData, &d); err != nil {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeUnsubscribeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", typeUnsubscribe),
		})

		return
	}

	appChannel := c.appID + ":" + d.Channel
	if !validateChannelName(d.Channel) {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeUnsubscribeError,
			Reason: fmt.Sprintf("invalid 'channel' for mesage of type '%v'", typeUnsubscribe),
		})

		return
	}

	isSubscribed := slices.Contains(c.channels, appChannel)
	if !isSubscribed {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typeUnsubscribeError,
			Reason: fmt.Sprintf("you're not subscribed to the channel %s", d.Channel),
		})

		return
	}

	c.channels = common.Filter(c.channels, func(channel string) bool {
		return channel != appChannel
	})

	c.hub.unsubscribe <- &hubUnsubscription{client: c, channel: appChannel}
	key := "subscribers:" + appChannel
	i := rdb.Decr(ctx, key)
	subscribersLeft := i.Val()
	if subscribersLeft == 0 {
		rdb.Del(ctx, key)
	}

	c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
	c.Ws.WriteJSON(newUnsubscribeSuccessMessage(d.Channel))
}

func (c *Client) publish(data interface{}, nc *nats.EncodedConn) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typePublishError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", typePublish),
		})

		return
	}

	d := publishMessageData{}
	if err := json.Unmarshal(jsonData, &d); err != nil {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typePublishError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", typeSubscribe),
		})

		return
	}

	appChannel := c.appID + ":" + d.Channel
	isSubscribed := slices.Contains(c.channels, appChannel)
	if !isSubscribed {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typePublishError,
			Reason: fmt.Sprintf("you're not subscribed to the channel %s", d.Channel),
		})

		return
	}

	if !c.hasCapability(string(typePublish), d.Channel, c.capabilities) {
		c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
		c.Ws.WriteJSON(&errorMessage{
			Type:   typePublishError,
			Reason: fmt.Sprintf("you're not allowed to publish messages on the channel %s", d.Channel),
		})

		return
	}

	var publisherID string
	if !d.IncludePublisher {
		publisherID = c.sessionID
	}

	nc.Publish("channel_publish", &natsChannelPublishData{
		Channel:     appChannel,
		Data:        d.Data,
		PublisherID: publisherID,
	})
}

func (c *Client) readMessages(rdb *redis.Client, nc *nats.EncodedConn) {
	defer func() {
		c.hub.unregister <- c
		c.Ws.Close()
	}()

	for {
		_, msg, err := c.Ws.ReadMessage()
		if err != nil {
			break
		}

		var payload message
		unmarshalErr := json.Unmarshal(msg, &payload)
		if unmarshalErr != nil {
			break
		}

		switch payload.Type {
		case typeSubscribe:
			c.subscribe(payload.Data, rdb)

		case typeUnsubscribe:
			c.unsubscribe(payload.Data, rdb)

		case typePublish:
			c.publish(payload.Data, nc)
		}
	}
}
