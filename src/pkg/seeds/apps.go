package seeds

import (
	"encoding/json"

	"github.com/gmencz/mycelium/pkg/models"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	logger "github.com/sirupsen/logrus"
)

func CreateApp(db *gorm.DB, name string) error {
	capabilities := make(map[string]string)
	capabilities["*"] = "*"
	capabilitiesBytes, err := json.Marshal(capabilities)
	if err != nil {
		logger.Fatal(err)
	}

	return db.Create(&models.App{
		ID:   uuid.NewString(),
		Name: name,
		ApiKeys: []models.ApiKey{
			{
				ID:           uuid.NewString(),
				Secret:       uuid.NewString(),
				Capabilities: datatypes.JSON(capabilitiesBytes),
			},
		},
	}).Error
}
