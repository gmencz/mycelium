package seeds

import (
	"gorm.io/gorm"
)

func All() []Seed {
	return []Seed{
		{
			Name: "CreateApp1",
			Run: func(db *gorm.DB) error {
				return CreateApp(db, "App1")
			},
		},
		{
			Name: "CreateApp2",
			Run: func(db *gorm.DB) error {
				return CreateApp(db, "App2")
			},
		},
	}
}
