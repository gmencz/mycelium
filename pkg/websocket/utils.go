package websocket

import (
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time to wait before force closing the connection.
	closeGracePeriod = 10 * time.Second
)

func CloseWithMessage(ws *websocket.Conn, data []byte) {
	ws.SetWriteDeadline(time.Now().Add(writeWait))
	ws.WriteMessage(websocket.CloseMessage, data)
	time.Sleep(closeGracePeriod)
	ws.Close()
}
