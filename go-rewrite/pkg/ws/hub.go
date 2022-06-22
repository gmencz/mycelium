package ws

import (
	"github.com/gmencz/mycelium/pkg/common"
	"github.com/go-redis/redis/v9"
)

// hub maintains the set of active clients.
type hub struct {
	// Registered clients.
	clients map[*client]bool

	// Register a client.
	register chan *client

	// Unregister a client.
	unregister chan *client

	// Subscribe to a channel
	subscribe chan *hubSubscription

	// Unsubscribe from a channel
	unsubscribe chan *hubUnsubscription

	// The channels and clients subscribed to them.
	channelsClients map[string][]*client

	// The clients and channels they're subscribed to.
	clientsChannels map[*client][]string
}

type hubSubscription struct {
	client  *client
	channel string
}

type hubUnsubscription struct {
	client  *client
	channel string
}

func newHub() *hub {
	return &hub{
		register:        make(chan *client),
		unregister:      make(chan *client),
		clients:         make(map[*client]bool),
		subscribe:       make(chan *hubSubscription),
		unsubscribe:     make(chan *hubUnsubscription),
		channelsClients: make(map[string][]*client),
		clientsChannels: make(map[*client][]string),
	}
}

func (h *hub) run(rdb *redis.Client) {
	// rdb.FlushDB(ctx)

	for {
		select {
		case client := <-h.register:
			h.clients[client] = true

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

				h.channelsClients[channel] = common.Filter(h.channelsClients[channel], func(cl *client) bool {
					return cl.sessionID != c.sessionID
				})
			}

			delete(h.clientsChannels, c)

		case subscription := <-h.subscribe:
			h.channelsClients[subscription.channel] = append(h.channelsClients[subscription.channel], subscription.client)

		case unsubscription := <-h.unsubscribe:
			h.channelsClients[unsubscription.channel] = common.Filter(h.channelsClients[unsubscription.channel], func(client *client) bool {
				return client.sessionID != unsubscription.client.sessionID
			})
		}
	}
}
