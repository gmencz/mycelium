package models

type App struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	ApiKeys []ApiKey
}
