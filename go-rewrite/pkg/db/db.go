package db

import (
	"os"

	"github.com/gmencz/mycelium/pkg/models"
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

	migrateErr := db.AutoMigrate(&models.App{}, &models.ApiKey{})
	if migrateErr != nil {
		logger.Fatalln(migrateErr)
	}

	return db
}
