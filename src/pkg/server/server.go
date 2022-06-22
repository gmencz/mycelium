package server

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gmencz/mycelium/pkg/ws"
	"github.com/go-redis/redis/v9"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

var (
	Port = os.Getenv("PORT")
)

type Server struct {
	router *gin.Engine
	wsHub  *ws.Hub
	rdb    *redis.Client
	nc     *nats.EncodedConn
}

func NewServer(db *gorm.DB, rdb *redis.Client, nc *nats.EncodedConn) *Server {
	router := gin.Default()
	router.SetTrustedProxies(nil)
	wsHub := ws.NewHub()

	ws.RegisterRoutes(router, db, rdb, nc, wsHub)

	return &Server{
		router,
		wsHub,
		rdb,
		nc,
	}
}

func (s *Server) Start() (err error) {
	var address string

	if Port == "" {
		address = ":8080"
	} else {
		address = ":" + Port
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	go func() {
		<-quit
		s.Shutdown()
	}()

	go s.wsHub.Run(s.rdb, s.nc)
	return s.router.Run(address)
}

var ctx = context.Background()

func (s *Server) Shutdown() {
	logrus.Info("attempting a graceful shutdown")

	timeoutTimer := time.NewTimer(time.Minute)
	go func() {
		<-timeoutTimer.C
		logrus.Info("forcing a shutdown")
		os.Exit(1)
	}()

	for client := range s.wsHub.ClientsChannels {
		ws.CloseWithMessage(client.Ws, websocket.FormatCloseMessage(4009, "please reconnect"))
	}

	for channel := range s.wsHub.ChannelsClients {
		key := "subscribers:" + channel
		decrBy := len(s.wsHub.ChannelsClients[channel])
		i := s.rdb.DecrBy(ctx, key, int64(decrBy))
		subscribersLeft := i.Val()
		if subscribersLeft == 0 {
			s.rdb.Del(ctx, key)
		}
	}

	os.Exit(0)
}
