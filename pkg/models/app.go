package models

import "gorm.io/gorm"

type App struct {
	gorm.Model
	ID      string   `json:"id" gorm:"primaryKey"`
	Name    string   `json:"name"`
	ApiKeys []ApiKey `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}
