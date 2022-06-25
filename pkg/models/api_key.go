package models

type ApiKey struct {
	ID           string `json:"id"`
	Secret       string `json:"secret"`
	Capabilities string `json:"capabilities"`
	AppID        string `json:"app_id"`
}
