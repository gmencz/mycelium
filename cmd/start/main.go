package main

import (
	"github.com/gmencz/mycelium/pkg/server"
	logger "github.com/sirupsen/logrus"
)

func main() {
	server := server.NewServer()
	logger.Fatal(server.Start())
}
