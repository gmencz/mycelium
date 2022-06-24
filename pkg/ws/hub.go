package ws

import (
	"strings"
	"time"

	"github.com/gmencz/mycelium/pkg/common"
	"github.com/go-redis/redis/v8"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
)

// Hub maintains the set of active clients and manages subscriptions.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Register a client.
	register chan *Client

	// Unregister a client.
	unregister chan *Client

	// Subscribe to a channel
	subscribe chan *hubSubscription

	// Unsubscribe from a channel
	unsubscribe chan *hubUnsubscription

	// The channels and clients subscribed to them.
	ChannelsClients map[string][]*Client

	// The clients and channels they're subscribed to.
	ClientsChannels map[*Client][]string
}

type hubSubscription struct {
	client  *Client
	channel string
}

type hubUnsubscription struct {
	client  *Client
	channel string
}

type natsChannelPublishData struct {
	Channel     string      `json:"channel"`
	Data        interface{} `json:"data"`
	PublisherID string      `json:"publisher_id"`
}

// NewHub returns an initialized Hub.
func NewHub() *Hub {
	return &Hub{
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		clients:         make(map[*Client]bool),
		subscribe:       make(chan *hubSubscription),
		unsubscribe:     make(chan *hubUnsubscription),
		ChannelsClients: make(map[string][]*Client),
		ClientsChannels: make(map[*Client][]string),
	}
}

// Run runs the Hub.
func (h *Hub) Run(rdb *redis.Client, nc *nats.EncodedConn) {
	nc.Subscribe("channel_publish", func(data *natsChannelPublishData) {
		clients, ok := h.ChannelsClients[data.Channel]
		if !ok {
			return
		}

		// Channel parts: <app-id>:<channel-name>
		channelParts := strings.Split(data.Channel, ":")
		if len(channelParts) != 2 {
			return
		}
		channelName := channelParts[1]

		// If there's no publisherID, publish message to every subscriber of the channel.
		if data.PublisherID == "" {
			for _, c := range clients {
				c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
				c.Ws.WriteJSON(newPublishMessage(channelName, data.Data))
			}

			return
		}

		// If we're here, there's a publisherID which means we need to exclude the client with
		// that id (the client could be on this server or not but we still need to check).
		for _, c := range clients {
			if c.sessionID != data.PublisherID {
				c.Ws.SetWriteDeadline(time.Now().Add(writeWait))
				c.Ws.WriteJSON(newPublishMessage(channelName, data.Data))
			}
		}
	})

	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			logrus.Info("new client registered, updated number of clients: ", len(h.clients))

		case c := <-h.unregister:
			delete(h.clients, c)

			for _, channel := range c.channels {
				key := "subscribers:" + channel
				channelExists := rdb.Exists(ctx, key)
				if channelExists.Val() > 0 {
					i := rdb.Decr(ctx, key)
					subscribersLeft := i.Val()
					if subscribersLeft == 0 {
						rdb.Del(ctx, key)
					}
				}

				h.ChannelsClients[channel] = common.Filter(h.ChannelsClients[channel], func(cl *Client) bool {
					return cl.sessionID != c.sessionID
				})
			}

			delete(h.ClientsChannels, c)
			logrus.Info("client unregistered, updated number of clients: ", len(h.clients))

		case subscription := <-h.subscribe:
			h.ChannelsClients[subscription.channel] = append(h.ChannelsClients[subscription.channel], subscription.client)

		case unsubscription := <-h.unsubscribe:
			h.ChannelsClients[unsubscription.channel] = common.Filter(h.ChannelsClients[unsubscription.channel], func(client *Client) bool {
				return client.sessionID != unsubscription.client.sessionID
			})
		}
	}
}