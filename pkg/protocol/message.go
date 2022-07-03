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

	MessageTypeSituationListen        = "situation_listen"         // Client -> server when wanting to listen to the situation of channels.
	MessageTypeSituationListenSuccess = "situation_listen_success" // Server -> client after a situation listen.

	MessageTypeSituationUnlisten        = "situation_unlisten"         // Client -> server when wanting to unlisten to the situation of channels.
	MessageTypeSituationUnlistenSuccess = "situation_unlisten_success" // Server -> client after a situation unlisten.

	MessageTypeSituationChange = "situation_change" // Server -> client after a situation change.
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
	SequenceNumber int64 `json:"s"`
}

// Data of messages of type "publish_success".
type PublishSuccessMessageData struct {
	SequenceNumber int64 `json:"s"`
}

// Data of messages of type "unsubscribe_success".
type UnsubscribeSuccessMessageData struct {
	SequenceNumber int64 `json:"s"`
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

// We're creating a new type of message that allows clients to be notified of the
// vacancy/occupation (situation) of channels by a prefix.

// Data of messages of type "situation_listen".
type SituationListenMessageData struct {
	SequenceNumber int64  `json:"s"`
	ChannelPrefix  string `json:"cp"`
}

// Data of messages of type "situation_unlisten".
type SituationUnlistenMessageData struct {
	SequenceNumber int64  `json:"s"`
	ChannelPrefix  string `json:"cp"`
}

// Data of messages of type "situation_listen_success".
type SituationListenSuccessMessageData struct {
	SequenceNumber int64 `json:"s"`
}

// Data of messages of type "situation_unlisten_success".
type SituationUnlistenSuccessMessageData struct {
	SequenceNumber int64 `json:"s"`
}

// Data of messages of type "situation_change".
type SituationChangeMessageData struct {
	Channel   string `json:"c"`
	Situation string `json:"s"`
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

// Returns a message with the data of messages of type "situation_change".
func NewSituationChangeMessage(data *SituationChangeMessageData) *Message {
	return &Message{
		Type: MessageTypeSituationChange,
		Data: data,
	}
}

// Returns a message with the data of messages of type "situation_listen_success".
func NewSituationListenSuccessMessage(data *SituationListenSuccessMessageData) *Message {
	return &Message{
		Type: MessageTypeSituationListenSuccess,
		Data: data,
	}
}

// Returns a message with the data of messages of type "situation_listen_success".
func NewSituationUnlistenSuccessMessage(data *SituationUnlistenSuccessMessageData) *Message {
	return &Message{
		Type: MessageTypeSituationUnlistenSuccess,
		Data: data,
	}
}
