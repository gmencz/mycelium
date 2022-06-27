package websocket

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gmencz/mycelium/pkg/common"
	"github.com/gmencz/mycelium/pkg/models"
	"github.com/gmencz/mycelium/pkg/protocol"
	"github.com/go-redis/redis/v8"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"golang.org/x/exp/slices"
	"gorm.io/gorm"
)

type Client struct {
	hub                    *Hub
	sessionID              string
	Ws                     *websocket.Conn
	apiKeyID               string
	AppID                  string
	capabilities           map[string]string
	channels               []string
	messagesSentLastSecond int
	mu                     sync.Mutex
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

	// Maximum messages a client can send per second
	maxMessagesPerSecond = 10
)

// NewClient tries to authenticate the connection and returns a new client if successful.
func NewClient(request *http.Request, ws *websocket.Conn, db *gorm.DB, hub *Hub) (c *Client, closeMessage []byte) {
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
		// Key format: <api-key-id:api-key-secret>. This authentication method should only be used in trusted environments like in
		// server side WebSockets.
		keyParts := strings.Split(key, ":")
		if len(keyParts) != 2 {
			return nil, websocket.FormatCloseMessage(4001, "invalid key")
		}

		apiKeyID := keyParts[0]
		apiKeySecret := keyParts[1]

		if result := db.First(&apiKey, "id = ?", apiKeyID); result.Error != nil {
			return nil, websocket.FormatCloseMessage(4001, "invalid key")
		}

		if apiKey.Secret != apiKeySecret {
			return nil, websocket.FormatCloseMessage(4001, "invalid key")
		}

		if err := json.Unmarshal([]byte(apiKey.Capabilities), &capabilities); err != nil {
			logrus.Info(err.Error())
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
				if err := json.Unmarshal([]byte(apiKey.Capabilities), &capabilities); err != nil {
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
		sessionID:              uuid.NewString(),
		Ws:                     ws,
		apiKeyID:               apiKey.ID,
		AppID:                  apiKey.AppID,
		capabilities:           capabilities,
		hub:                    hub,
		channels:               make([]string, 0),
		messagesSentLastSecond: 0,
	}, nil
}

// Tracks the client in redis, this is used to calculate pricing and analytics.
func (c *Client) track(rdb *redis.Client) (closeMessage []byte) {
	currentClientsKey := "current-clients:" + c.AppID
	currentClientsResult := rdb.Incr(ctx, currentClientsKey)
	if currentClientsResult.Err() != nil {
		return websocket.FormatCloseMessage(4500, "internal server error")
	}
	currentClients := currentClientsResult.Val()

	// Peak clients for this month.
	year, month, _ := time.Now().UTC().Date()
	peakClientsKey := fmt.Sprintf("peak-clients:%s:%d-%d", c.AppID, month, year)
	peakClientsExists := rdb.Exists(ctx, peakClientsKey)
	if peakClientsExists.Err() != nil {
		return websocket.FormatCloseMessage(4500, "internal server error")
	}

	// If it doesn't exist
	if peakClientsExists.Val() <= 0 {
		if setPeakClientsResult := rdb.Set(ctx, peakClientsKey, currentClients, 0); setPeakClientsResult.Err() != nil {
			return websocket.FormatCloseMessage(4500, "internal server error")
		}
	} else {
		peakClientsResult := rdb.Get(ctx, peakClientsKey)
		if peakClientsResult.Err() != nil {
			return websocket.FormatCloseMessage(4500, "internal server error")
		}

		peakClients, peakClientsErr := peakClientsResult.Int64()
		if peakClientsErr != nil {
			return websocket.FormatCloseMessage(4500, "internal server error")
		}

		if currentClients > peakClients {
			if setPeakClientsResult := rdb.Set(ctx, peakClientsKey, currentClients, 0); setPeakClientsResult.Err() != nil {
				return websocket.FormatCloseMessage(4500, "internal server error")
			}
		}
	}

	return nil
}

func (c *Client) StartSession(rdb *redis.Client) {
	c.hub.register <- c

	closeMessage := c.track(rdb)
	if closeMessage != nil {
		CloseWithMessage(c.Ws, closeMessage)
		return
	}

	c.Ws.SetReadLimit(maxMessageSize)
	c.Ws.SetReadDeadline(time.Now().Add(pongWait))
	c.Ws.SetPongHandler(func(string) error { c.Ws.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	c.WriteJSON(protocol.NewHelloMessage(&protocol.HelloMessageData{SessionID: c.sessionID}))
}

func (c *Client) Ping() {
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		c.hub.unregister <- c
		ticker.Stop()
		c.Ws.Close()
	}()

	for range ticker.C {
		c.Write(websocket.PingMessage, nil)
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
		c.WriteJSON(&protocol.ErrorMessage{
			Type:   protocol.MessageTypeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", protocol.MessageTypeSubscribe),
		})

		return
	}

	d := protocol.SubscribeMessageData{}
	if err := json.Unmarshal(jsonData, &d); err != nil {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:   protocol.MessageTypeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", protocol.MessageTypeSubscribe),
		})

		return
	}

	appChannel := c.AppID + ":" + d.Channel
	if !common.ValidateString(d.Channel) {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("invalid 'channel' for mesage of type '%v'", protocol.MessageTypeSubscribe),
		})

		return
	}

	isAlreadySubscribed := slices.Contains(c.channels, appChannel)
	if isAlreadySubscribed {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("you're already subscribed to the channel %s", d.Channel),
		})

		return
	}

	if len(c.channels) > maxChannels {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("you can't subscribe to more than %v channels", maxChannels),
		})

		return
	}

	if !c.hasCapability(string(protocol.MessageTypeSubscribe), d.Channel, c.capabilities) {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("you're not allowed to subscribe to the channel %s", d.Channel),
		})

		return
	}

	c.channels = append(c.channels, appChannel)
	c.hub.subscribe <- &hubSubscription{client: c, channel: appChannel}
	rdb.Incr(ctx, "subscribers:"+appChannel)
	c.WriteJSON(protocol.NewSubscribeSuccessMessage(&protocol.SubscribeSuccessMessageData{Channel: d.Channel, SequenceNumber: d.SequenceNumber}))
}

func (c *Client) unsubscribe(data interface{}, rdb *redis.Client) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:   protocol.MessageTypeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", protocol.MessageTypeUnsubscribe),
		})

		return
	}

	d := protocol.UnsubscribeMessageData{}
	if err := json.Unmarshal(jsonData, &d); err != nil {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:   protocol.MessageTypeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", protocol.MessageTypeUnsubscribe),
		})

		return
	}

	appChannel := c.AppID + ":" + d.Channel
	if !common.ValidateString(d.Channel) {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("invalid 'channel' for mesage of type '%v'", protocol.MessageTypeUnsubscribe),
		})

		return
	}

	isSubscribed := slices.Contains(c.channels, appChannel)
	if !isSubscribed {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("you're not subscribed to the channel %s", d.Channel),
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
	if subscribersLeft <= 0 {
		rdb.Del(ctx, key)
	}

	c.WriteJSON(protocol.NewUnsubscribeSuccessMessage(&protocol.UnsubscribeSuccessMessageData{Channel: d.Channel, SequenceNumber: d.SequenceNumber}))
}

func (c *Client) publish(data interface{}, nc *nats.EncodedConn, rdb *redis.Client) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:   protocol.MessageTypeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", protocol.MessageTypePublish),
		})

		return
	}

	d := protocol.PublishMessageDataData{}
	if err := json.Unmarshal(jsonData, &d); err != nil {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:   protocol.MessageTypeError,
			Reason: fmt.Sprintf("invalid data for mesage of type '%v'", protocol.MessageTypePublish),
		})

		return
	}

	appChannel := c.AppID + ":" + d.Channel
	isSubscribed := slices.Contains(c.channels, appChannel)
	if !isSubscribed {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("you're not subscribed to the channel %s", d.Channel),
		})

		return
	}

	if !c.hasCapability(string(protocol.MessageTypePublish), d.Channel, c.capabilities) {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         fmt.Sprintf("you're not allowed to publish messages on the channel %s", d.Channel),
		})

		return
	}

	var publisherID string
	if !d.IncludePublisher {
		publisherID = c.sessionID
	}

	publishErr := nc.Publish("channel_publish", &natsChannelPublishData{
		Channel:     appChannel,
		Data:        d.Data,
		PublisherID: publisherID,
	})

	if publishErr != nil {
		c.WriteJSON(&protocol.ErrorMessage{
			Type:           protocol.MessageTypeError,
			SequenceNumber: d.SequenceNumber,
			Reason:         "internal server error publishing message",
		})

		return
	}

	// Published messages in a month (for pricing and analytics).
	year, month, _ := time.Now().UTC().Date()
	publishedMessagesKey := fmt.Sprintf("published-messages:%s:%d-%d", c.AppID, month, year)
	incr := rdb.Incr(ctx, publishedMessagesKey)
	if incr.Err() != nil {
		logrus.Error(fmt.Sprintf("failed to track published message at key %s", publishedMessagesKey))
	}

	c.WriteJSON(protocol.NewPublishSuccessMessage(&protocol.PublishSuccessMessageData{Channel: d.Channel, SequenceNumber: d.SequenceNumber}))
}

func (c *Client) WriteJSON(v interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
	return c.Ws.WriteJSON(v)
}

func (c *Client) Write(messageType int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
	return c.Ws.WriteMessage(messageType, data)
}

func (c *Client) CloseWithMessage(data []byte) {
	c.Write(websocket.CloseMessage, data)
	time.Sleep(closeGracePeriod)
	c.Ws.Close()
}

func (c *Client) ReadMessages(rdb *redis.Client, nc *nats.EncodedConn) {
	messagesSentLastSecondTicker := time.NewTicker(time.Second)
	go func() {
		for range messagesSentLastSecondTicker.C {
			c.messagesSentLastSecond = 0
		}
	}()

	defer func() {
		c.hub.unregister <- c
		messagesSentLastSecondTicker.Stop()
		c.Ws.Close()
	}()

	for {
		_, bytes, err := c.Ws.ReadMessage()
		if err != nil {
			break
		}

		if c.messagesSentLastSecond >= (maxMessagesPerSecond - 1) {
			c.CloseWithMessage(websocket.FormatCloseMessage(4029, "too many messages"))
			break
		}

		c.messagesSentLastSecond++
		var message protocol.Message
		unmarshalErr := json.Unmarshal(bytes, &message)
		if unmarshalErr != nil {
			c.CloseWithMessage(websocket.FormatCloseMessage(4010, "invalid message"))
			break
		}

		switch message.Type {
		case protocol.MessageTypeSubscribe:
			c.subscribe(message.Data, rdb)

		case protocol.MessageTypeUnsubscribe:
			c.unsubscribe(message.Data, rdb)

		case protocol.MessageTypePublish:
			c.publish(message.Data, nc, rdb)
		}
	}
}
