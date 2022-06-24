package ws

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	logger "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(*http.Request) bool {
		// Allow all origins.
		return true
	},
}

var ctx = context.Background()

// RegisterRoutes sets up the WebSocket routes.
func RegisterRoutes(router *gin.Engine, db *gorm.DB, rdb *redis.Client, nc *nats.EncodedConn, hub *Hub) {
	router.GET("/ws", func(ctx *gin.Context) {
		ws, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
		if err != nil {
			logger.Println(err)
			return
		}

		client, closeMessage := newClient(ctx.Request, ws, db, hub)
		if closeMessage != nil {
			CloseWithMessage(ws, closeMessage)
			return
		}

		client.startSession()

		go client.ping()
		client.readMessages(rdb, nc)
	})
}
