package models

import (
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ApiKey struct {
	gorm.Model
	ID           string         `json:"id" gorm:"primaryKey"`
	Secret       string         `json:"secret" gorm:"uniqueIndex"`
	Capabilities datatypes.JSON `json:"capabilities"`
	AppID        string         `json:"app_id"`
}
