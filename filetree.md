/opense-stack
├── /apps
│   ├── /deck            <-- (Open Deck) The presentation/dashboard app
│   │   ├── package.json ("name": "open-deck")
│   │
│   ├── /etl             <-- (Open ETL) The data processing app
│   │   ├── package.json ("name": "open-etl")
│   │
│   └── /stoqr           <-- (Open StoQr) The inventory app
│       ├── package.json ("name": "open-stoqr")
│
├── /packages
│   ├── /ui              <-- Shared components
│   │   ├── package.json ("name": "@opense/ui")
│   │
│   ├── /database        <-- Shared Supabase types
│   │   ├── package.json ("name": "@opense/database")
│   │
│   └── /utils           <-- Shared helpers (dates, currency)
│       ├── package.json ("name": "@opense/utils")
│
└── package.json         <-- Root