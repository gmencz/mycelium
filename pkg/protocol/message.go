package protocol

// Message types.
const (
	MessageTypeHello = "hello" // Server -> client on successful connection.

	MessageTypeError = "error" // Server -> client on errors.

	MessageTypeSubscribe        = "subscribe"         // Client -> server when wanting to subscribe to a channel.
	MessageTypeSubscribeSuccess = "subscribe_success" // Server -> client after a successful channel subscription.

	MessageTypeUnsubscribe        = "unsubscribe"         // Client -> server when wanting to unsubscribe from a channel.
	MessageTypeUnsubscribeSuccess = "unsubscribe_success" // Server -> client after a successful channel unsubscription.

	MessageTypePublish        = "publish"         // Client -> server when wanting to unsubscribe from a channel.
	MessageTypePublishSuccess = "publish_success" // Server -> client after a successful publish.
)

// Server <-> client message.
type Message struct {
	Type string      `json:"t"`
	Data interface{} `json:"d"`
}

// Data of messages of type "hello".
type HelloMessageData struct {
	SessionID string `json:"sid"`
}

// Data of messages of type "subscribe".
type SubscribeMessageData struct {
	SequenceNumber int64  `json:"s"`
	Channel        string `json:"c"`
}

// Data of messages of type "unsubscribe".
type UnsubscribeMessageData struct {
	SequenceNumber int64  `json:"s"`
	Channel        string `json:"c"`
}

// Server -> client error message.
type ErrorMessage struct {
	SequenceNumber int64  `json:"s"`
	Type           string `json:"t"`
	Reason         string `json:"r"`
}

// Data of messages of type "subscribe_success".
type SubscribeSuccessMessageData struct {
	SequenceNumber int64  `json:"s"`
	Channel        string `json:"c"`
}

// Data of messages of type "publish_success".
type PublishSuccessMessageData struct {
	SequenceNumber int64  `json:"s"`
	Channel        string `json:"c"`
}

// Data of messages of type "unsubscribe_success".
type UnsubscribeSuccessMessageData struct {
	SequenceNumber int64  `json:"s"`
	Channel        string `json:"c"`
}

// Data of messages of type "publish".
type PublishMessageData struct {
	Channel string      `json:"c"`
	Event   string      `json:"e"`
	Data    interface{} `json:"d"`
}

// Data data of messages of type "publish".
type PublishMessageDataData struct {
	SequenceNumber   int64       `json:"s"`
	IncludePublisher bool        `json:"ip"`
	Channel          string      `json:"c"`
	Event            string      `json:"e"`
	Data             interface{} `json:"d"`
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
