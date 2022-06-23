package controllers

import (
	"github.com/go-redis/redis/v8"
	"gorm.io/gorm"
)

type Controller struct {
	Rdb *redis.Client
	Db  *gorm.DB
}
