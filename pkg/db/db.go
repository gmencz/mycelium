package db

import (
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	logger "github.com/sirupsen/logrus"
)

var (
	DatabaseURL = os.Getenv("DATABASE_URL")
)

func NewDB() *gorm.DB {
	db, openErr := gorm.Open(postgres.Open(DatabaseURL), &gorm.Config{})
	if openErr != nil {
		logger.Fatalln(openErr)
	}

	return db
}
