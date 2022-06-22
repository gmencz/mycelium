package ws

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v9"
	"github.com/gorilla/websocket"
	logger "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var ctx = context.Background()

// RegisterRoutes sets up the WebSocket routes.
func RegisterRoutes(router *gin.Engine, db *gorm.DB, rdb *redis.Client) {
	hub := newHub()
	go hub.run(rdb)

	router.GET("/ws", func(ctx *gin.Context) {
		ws, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
		if err != nil {
			logger.Println(err)
			return
		}

		client, closeMessage := newClient(ctx.Request, ws, db, hub)
		if closeMessage != nil {
			closeWithMessage(ws, closeMessage)
			return
		}

		client.startSession()

		go client.ping()
		go client.readMessages(rdb)
	})
}
