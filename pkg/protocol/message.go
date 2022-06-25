package protocol

// Message types.
const (
	MessageTypeHello = "hello" // Server -> client on successful connection.

	MessageTypeSubscribe        = "subscribe"         // Client -> server when wanting to subscribe to a channel.
	MessageTypeSubscribeSuccess = "subscribe_success" // Server -> client after a successful channel subscription.
	MessageTypeSubscribeError   = "subscribe_error"   // Server -> client after a failed channel subscription.

	MessageTypeUnsubscribe        = "unsubscribe"         // Client -> server when wanting to unsubscribe from a channel.
	MessageTypeUnsubscribeSuccess = "unsubscribe_success" // Server -> client after a successful channel unsubscription.
	MessageTypeUnsubscribeError   = "unsubscribe_error"   // Server -> client after a failed channel unsubscription.

	MessageTypePublish        = "publish"         // Client -> server when wanting to unsubscribe from a channel.
	MessageTypePublishSuccess = "publish_success" // Server -> client after a successful publish.
	MessageTypePublishError   = "publish_error"   // Server -> client after a failed publish.
)

// Server <-> client message.
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Data of messages of type "hello".
type HelloMessageData struct {
	SessionID string `json:"session_id"`
}

// Data of messages of type "subscribe".
type SubscribeMessageData struct {
	Channel string `json:"channel"`
}

// Data of messages of type "unsubscribe".
type UnsubscribeMessageData struct {
	Channel string `json:"channel"`
}

// Server -> client error message.
type ErrorMessage struct {
	Type   string `json:"type"`
	Reason string `json:"reason"`
}

// Data of messages of type "subscribe_success".
type SubscribeSuccessMessageData struct {
	Channel string `json:"channel"`
}

// Data of messages of type "publish_success".
type PublishSuccessMessageData struct {
	Channel string `json:"channel"`
}

// Data of messages of type "unsubscribe_success".
type UnsubscribeSuccessMessageData struct {
	Channel string `json:"channel"`
}

// Data of messages of type "publish".
type PublishMessageData struct {
	Channel string      `json:"channel"`
	Data    interface{} `json:"data"`
}

// Data data of messages of type "publish".
type PublishMessageDataData struct {
	IncludePublisher bool        `json:"include_publisher"`
	Channel          string      `json:"channel"`
	Data             interface{} `json:"data"`
}

// Returns a message with the data of messages of type "hello".
func NewHelloMessage(data *HelloMessageData) *Message {
	return &Message{
		Type: MessageTypeHello,
		Data: data,
	}
}

// Returns a message with the data of messages of type "subscribe_success".
func NewSubscribeSuccessMessage(data *SubscribeSuccessMessageData) *Message {
	return &Message{
		Type: MessageTypeSubscribeSuccess,
		Data: data,
	}
}

// Returns a message with the data of messages of type "publish_success".
func NewPublishSuccessMessage(data *PublishSuccessMessageData) *Message {
	return &Message{
		Type: MessageTypePublishSuccess,
		Data: data,
	}
}

// Returns a message with the data of messages of type "unsubscribe_success".
func NewUnsubscribeSuccessMessage(data *UnsubscribeSuccessMessageData) *Message {
	return &Message{
		Type: MessageTypeUnsubscribeSuccess,
		Data: data,
	}
}

// Returns a message with the data of messages of type "publish".
func NewPublishMessage(data *PublishMessageData) *Message {
	return &Message{
		Type: MessageTypePublish,
		Data: data,
	}
}
