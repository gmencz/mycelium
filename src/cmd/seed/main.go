package main

import (
	"github.com/gmencz/mycelium/pkg/db"
	"github.com/gmencz/mycelium/pkg/models"
	"github.com/gmencz/mycelium/pkg/seeds"
	logger "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func main() {
	DB := db.NewDB()
	postgresDB, err := DB.DB()
	if err != nil {
		logger.Fatal(err)
	}
	defer postgresDB.Close()

	DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.App{})

	for _, seed := range seeds.All() {
		if err := seed.Run(DB); err != nil {
			logger.Fatalf("Running seed '%s', failed with error: %s", seed.Name, err)
		}
	}

	logger.Info("Database seeded 🌱")
}
