package server

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gmencz/mycelium/pkg/controllers"
	"github.com/gmencz/mycelium/pkg/db"
	"github.com/gmencz/mycelium/pkg/middlewares"
	"github.com/gmencz/mycelium/pkg/ws"
	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
)

var (
	Port          = os.Getenv("PORT")
	NatsHost      = os.Getenv("NATS_HOST")
	RedisAddress  = os.Getenv("REDIS_ADDRESS")
	RedisPassword = os.Getenv("REDIS_PASSWORD")
)

type Server struct {
	router          *gin.Engine
	wsHub           *ws.Hub
	rdb             *redis.Client
	nc              *nats.EncodedConn
	shutdownSignals chan os.Signal
}

func NewServer() *Server {
	// Router
	router := gin.Default()
	router.SetTrustedProxies(nil)

	// Dependencies
	wsHub := ws.NewHub()
	database := db.NewDB()
	nc, ncErr := nats.Connect(NatsHost)
	if ncErr != nil {
		logrus.Fatalln(ncErr)
	}

	c, cErr := nats.NewEncodedConn(nc, nats.JSON_ENCODER)
	if cErr != nil {
		logrus.Fatalln(cErr)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     RedisAddress,
		Password: RedisPassword,
		DB:       0, // use default DB
		Username: "default",
	})

	rateLimiterMiddleware, rateLimiterMiddlewareErr := middlewares.NewRateLimiterMiddleware("15000-H", rdb)
	if rateLimiterMiddlewareErr != nil {
		logrus.Fatalln(rateLimiterMiddlewareErr)
	}

	// Middlewares
	router.Use(rateLimiterMiddleware)

	// Routes
	ws.RegisterRoutes(router, database, rdb, c, wsHub)

	// API:v1.0
	v1 := router.Group("/api/v1/")
	{
		controller := &controllers.Controller{
			Rdb: rdb,
			Db:  database,
		}

		rHealth := v1.Group("health")
		rHealth.GET("", controller.Health)
		rHealth.GET("/live", controller.HealthLive)

		rApps := v1.Group("apps")
		rApps.GET("/:id/channels", controller.GetApp)
	}

	srv := &Server{
		router:          router,
		wsHub:           wsHub,
		rdb:             rdb,
		nc:              c,
		shutdownSignals: make(chan os.Signal, 1),
	}

	srv.configureSignals()

	return srv
}

func (s *Server) configureSignals() {
	signal.Notify(s.shutdownSignals, syscall.SIGTERM, syscall.SIGINT)
}

func (s *Server) listenTerminationSignals() {
	<-s.shutdownSignals
	s.Shutdown()
}

func (s *Server) Start() (err error) {
	defer s.Shutdown()

	go s.wsHub.Run(s.rdb, s.nc)
	go s.listenTerminationSignals()

	return s.router.Run(":" + Port)
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