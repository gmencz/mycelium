package seeds

import (
	"github.com/gmencz/mycelium/pkg/seed"
	"gorm.io/gorm"
)

func All() []seed.Seed {
	return []seed.Seed{
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
