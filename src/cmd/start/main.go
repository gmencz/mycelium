package main

import (
	"context"

	"github.com/gmencz/mycelium/pkg/db"
	"github.com/gmencz/mycelium/pkg/nats"
	"github.com/gmencz/mycelium/pkg/redis"
	"github.com/gmencz/mycelium/pkg/server"
	logger "github.com/sirupsen/logrus"
)

var ctx = context.Background()

func main() {
	database := db.NewDB()
	rdb := redis.NewRedis()
	nc := nats.NewConn()
	server := server.NewServer(database, rdb, nc)

	logger.Info(rdb.Keys(ctx, "*").Val())

	defer func() {
		server.Shutdown()
	}()

	logger.Fatal(server.Start())
}
