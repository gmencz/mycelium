package server

import (
	"os"

	"github.com/gin-gonic/gin"
	"github.com/gmencz/mycelium/pkg/ws"
	"github.com/go-redis/redis/v9"
	"gorm.io/gorm"
)

var (
	Port = os.Getenv("PORT")
)

type Server struct {
	router *gin.Engine
}

func NewServer(db *gorm.DB, rdb *redis.Client) *Server {
	router := gin.Default()
	router.SetTrustedProxies(nil)

	ws.RegisterRoutes(router, db, rdb)

	return &Server{
		router,
	}
}

func (s *Server) Start() (err error) {
	var address string

	if Port == "" {
		address = ":8080"
	} else {
		address = ":" + Port
	}

	return s.router.Run(address)
}
