## Welcome to Open-SE
Open-SE is a web-based B2B suite built to solve niche business problems. It's a monorepo containing 5 frontend applications that share authentication and UI components:
- accounts - User login/signup
- admin - Admin dashboard
- etl - Data extraction/loading tools
- stoqr - Inventory management with barcode scanning, labels, reports, and procurement
- ui-design - Component library
## Tech Stack
### Frontend
- React 19 - UI framework
- Vite 7 - Build tool and dev server      
- TypeScript - Type safety across all apps
- Tailwind CSS 4 - Utility-first CSS framework
- React Router 7 - Client-side routing
### Backend
- Supabase - Open source Firebase alternative
  - PostgreSQL - Primary database
  - Auth - User authentication and management
  - Edge Functions - Serverless TypeScript functions
  - Storage - File storage
### Development Tools
- Turbo - Build system for monorepos (caching, parallel execution)
- pnpm - Fast, disk space efficient package manager
- Playwright - End-to-end testing
## Getting Started
1. Have a look at [[01 Development Setup]]
2. Have a look at [[02 Project Structure]]
3. Start the project and play around!