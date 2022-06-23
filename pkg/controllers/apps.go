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

func (c *Controller) GetApp(ctx *gin.Context) {
	id := ctx.Param("id")
	auth, authErr := common.ParseAuthorizationHeader(ctx.Request.Header.Get("authorization"))
	if authErr != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"message": authErr.Error(),
		})
		return
	}

	var apiKey models.ApiKey
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

	if id != apiKey.AppID {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"message": "unauthorized to query this app",
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
