package redis

import (
	"os"

	"github.com/go-redis/redis/v9"
)

var (
	RedisAddress  = os.Getenv("REDIS_ADDRESS")
	RedisPassword = os.Getenv("REDIS_PASSWORD")
)

func NewRedis() *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     RedisAddress,
		Password: RedisPassword, // no password set
		DB:       0,             // use default DB
	})

	return rdb
}
