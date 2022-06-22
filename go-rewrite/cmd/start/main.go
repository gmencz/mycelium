package main

import (
	"github.com/gmencz/mycelium/pkg/db"
	"github.com/gmencz/mycelium/pkg/redis"
	"github.com/gmencz/mycelium/pkg/server"
	logger "github.com/sirupsen/logrus"
)

func main() {
	database := db.NewDB()
	rdb := redis.NewRedis()
	server := server.NewServer(database, rdb)

	logger.Fatal(server.Start())
}
