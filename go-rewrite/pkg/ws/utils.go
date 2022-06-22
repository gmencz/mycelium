package ws

import (
	"regexp"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time to wait before force closing the connection.
	closeGracePeriod = 10 * time.Second
)

func closeWithMessage(ws *websocket.Conn, data []byte) {
	ws.SetWriteDeadline(time.Now().Add(writeWait))
	ws.WriteMessage(websocket.CloseMessage, data)
	time.Sleep(closeGracePeriod)
	ws.Close()
}

func validateChannelName(channel string) bool {
	match, _ := regexp.MatchString("^[a-zA-Z0-9_-]+$", channel)
	channelLen := len(channel)
	if match && channelLen >= 1 && channelLen <= 255 {
		return true
	}

	return false
}
