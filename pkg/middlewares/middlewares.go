package middlewares

import (
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/sirupsen/logrus"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	sredis "github.com/ulule/limiter/v3/drivers/store/redis"
)

func NewRateLimiterMiddleware(formattedRate string, rdb *redis.Client) (gin.HandlerFunc, error) {
	// Define a limit rate to 15000 requests per hour.
	rate, rateErr := limiter.NewRateFromFormatted(formattedRate)
	if rateErr != nil {
		logrus.Fatalln(rateErr)
	}

	// Create a rate limiter store with the redis client.
	limiterStore, limiterStoreErr := sredis.NewStoreWithOptions(rdb, limiter.StoreOptions{
		Prefix: "rate_limiter",
	})

	if limiterStoreErr != nil {
		return nil, limiterStoreErr
	}

	// Create a new middleware with the limiter instance.
	middleware := mgin.NewMiddleware(limiter.New(limiterStore, rate))
	return middleware, nil
}

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "*")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
