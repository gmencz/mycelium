package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gmencz/mycelium/pkg/common"
	"github.com/gmencz/mycelium/pkg/models"
	"github.com/golang-jwt/jwt/v4"
)

func (c *Controller) GetChannels(ctx *gin.Context) {
	key := ctx.Query("key")

	var apiKey models.ApiKey

	if key != "" {
		// Key format: <api-key-id:api-key-secret>. This authentication method should only be used in trusted environments like in
		// server side.
		keyParts := strings.Split(key, ":")
		if len(keyParts) != 2 {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"message": "invalid key",
			})
			return
		}

		apiKeyID := keyParts[0]
		apiKeySecret := keyParts[1]

		if result := c.Db.First(&apiKey, "id = ?", apiKeyID); result.Error != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"message": "invalid key",
			})
			return
		}

		if apiKey.Secret != apiKeySecret {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"message": "invalid key",
			})
			return
		}
	} else if ctx.Request.Header.Get("authorization") != "" {
		auth, authErr := common.ParseAuthorizationHeader(ctx.Request.Header.Get("authorization"))
		if authErr != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"message": authErr.Error(),
			})
			return
		}

		_, jwtErr := jwt.Parse(auth, func(token *jwt.Token) (interface{}, error) {
			// Don't forget to validate the alg is what you expect:
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("invalid token, unexpected signing method")
			}

			kid := token.Header["kid"]
			if kid == nil {
				return nil, errors.New("invalid token, missing kid header")
			}

			if result := c.Db.First(&apiKey, "id = ?", kid); result.Error != nil {
				return nil, errors.New("invalid token kid header")
			}

			return []byte(apiKey.Secret), nil
		})

		if jwtErr != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"message": jwtErr.Error(),
			})
			return
		}
	} else {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"message": "unauthorized",
		})
		return
	}

	filterByPrefix := ctx.Request.URL.Query().Get("filter_by_prefix")
	cursor := 0

	if ctx.Request.URL.Query().Has("cursor") {
		cursorInt, cursorErr := strconv.Atoi(ctx.Request.URL.Query().Get("cursor"))
		if cursorErr != nil {
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"message": "invalid cursor, must be a number",
			})
			return
		}

		cursor = cursorInt
	}

	var match string
	if filterByPrefix != "" {
		match = "subscribers:" + apiKey.AppID + ":" + filterByPrefix + "*"
	} else {
		match = "subscribers:" + apiKey.AppID + ":*"
	}

	scanCmd := c.Rdb.Scan(ctx, uint64(cursor), match, 100)
	if scanCmd.Err() != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "internal server error",
		})
		return
	}

	channelsResult, resultCursor, _ := scanCmd.Result()

	uniqueChannels := common.RemoveDuplicateStrings(channelsResult)

	channels := common.Map(uniqueChannels, func(channel string) string {
		channelParts := strings.Split(channel, "subscribers:"+apiKey.AppID+":")
		return channelParts[1]
	})

	if resultCursor != 0 {
		ctx.JSON(http.StatusOK, gin.H{
			"channels": channels,
			"cursor":   resultCursor,
		})

		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"channels": channels,
	})
}
