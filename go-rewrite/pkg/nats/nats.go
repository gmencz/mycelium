package nats

import (
	"os"

	"github.com/nats-io/nats.go"
)

var (
	NatsHost = os.Getenv("NATS_HOST")
)

func NewConn() *nats.EncodedConn {
	nc, _ := nats.Connect(NatsHost)
	c, _ := nats.NewEncodedConn(nc, nats.JSON_ENCODER)

	return c
}
