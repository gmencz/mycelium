package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gmencz/mycelium/pkg/websocket"
	"github.com/go-redis/redis/v8"
	wsLib "github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

var upgrader = wsLib.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(*http.Request) bool {
		// Allow all origins.
		return true
	},
}

func (c *Controller) Realtime(ctx *gin.Context, db *gorm.DB, rdb *redis.Client, nc *nats.EncodedConn, hub *websocket.Hub) {
	ws, err := upgrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		logrus.Println(err)
		return
	}

	client, closeMessage := websocket.NewClient(ctx.Request, ws, db, hub)
	if closeMessage != nil {
		websocket.CloseWithMessage(ws, closeMessage)
		return
	}

	client.StartSession()

	go client.Ping()
	client.ReadMessages(rdb, nc)
}
