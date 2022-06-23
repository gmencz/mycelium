package controllers

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

var (
	NatsHealthcheckEndpoint = os.Getenv("NATS_HEALTHCHECK_ENDPOINT")
)

func (c *Controller) Health(ctx *gin.Context) {
	var host string
	xForwardedHostHeader := ctx.Request.Header.Get("X-Forwarded-Host")
	if xForwardedHostHeader != "" {
		host = xForwardedHostHeader
	} else {
		host = ctx.Request.Header.Get("Host")
	}

	// If we can make a HEAD request to ourselves, then we're good in terms of HTTP requests.
	if _, err := http.Head("http://" + host + "/api/v1/health/live"); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "HEAD request to self failed",
		})
		return
	}

	// If we can make a simple database query, then our database is fine.
	if tx := c.Db.Exec("SELECT 1"); tx.Error != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "database query failed",
		})
		return
	}

	// If we can send a redis PING and there's no error, redis is fine.
	if r := c.Rdb.Ping(ctx); r.Err() != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "redis PING failed",
		})
		return
	}

	// If we can make a request to the NATS healthcheck endpoint, nats is good.
	if _, err := http.Get(NatsHealthcheckEndpoint); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "NATS request failed",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"ok": true,
	})
}

func (c *Controller) HealthLive(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{
		"ok": true,
	})
}
