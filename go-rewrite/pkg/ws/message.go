package ws

type messageType string

const (
	typeHello              messageType = "hello"
	typeSubscribe          messageType = "subscribe"
	typeUnsubscribe        messageType = "unsubscribe"
	typePublish            messageType = "publish"
	typeSubscribeError     messageType = "subscribe_error"
	typeUnsubscribeError   messageType = "unsubscribe_error"
	typeSubscribeSuccess   messageType = "subscribe_success"
	typeUnsubscribeSuccess messageType = "unsubscribe_success"
)

type message struct {
	Type messageType `json:"type"`
	Data interface{} `json:"data"`
}

type helloMessage struct {
	SessionID string `json:"session_id"`
}

type subscribeMessageData struct {
	Channel string `json:"channel"`
}

type unsubscribeMessageData struct {
	Channel string `json:"channel"`
}

type errorMessage struct {
	Type   messageType `json:"type"`
	Reason string      `json:"reason"`
}

type subscribeSuccessMessage struct {
	Channel string `json:"channel"`
}

type unsubscribeSuccessMessage struct {
	Channel string `json:"channel"`
}

func newHelloMessage(sessionID string) *message {
	return &message{
		Type: typeHello,
		Data: &helloMessage{
			SessionID: sessionID,
		},
	}
}

func newSubscribeSuccessMessage(channel string) *message {
	return &message{
		Type: typeSubscribeSuccess,
		Data: &subscribeSuccessMessage{
			Channel: channel,
		},
	}
}

func newUnsubscribeSuccessMessage(channel string) *message {
	return &message{
		Type: typeUnsubscribeSuccess,
		Data: &unsubscribeMessageData{
			Channel: channel,
		},
	}
}
