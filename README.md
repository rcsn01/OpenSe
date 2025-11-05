# Fill The Shelf - Stock Management System

A full-stack stock management application with QR code scanning capabilities, built with React, Node.js, Express, and PostgreSQL.

## Features

- 🔐 **User Authentication**: Sign up and login functionality with JWT tokens
- 📷 **QR Code Scanning**: Scan QR codes using device camera or enter manually
- 📊 **Stock Reporting**: Report stock status (empty, low stock, in stock)
- 📝 **Notes & Images**: Attach notes and images to stock reports
- 📈 **Dashboard**: View statistics and recent reports
- 🗄️ **PostgreSQL Database**: Reliable data storage with relational database

## Tech Stack

### Frontend
- React 18
- React Router for navigation
- html5-qrcode for QR scanning
- Axios for API calls

### Backend
- Node.js & Express
- PostgreSQL database
- JWT for authentication
- Multer for file uploads
- bcrypt for password hashing

### Deployment
- Docker & Docker Compose
- Single-server deployment

## Getting Started

### Prerequisites

- Docker and Docker Compose installed on your system

### Installation & Running

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Fill-The-Shelf
   ```

2. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Open your browser and navigate to `http://localhost:3000`

4. Default sample products are created automatically:
   - `product-01`
   - `product-02`
   - `product-03`

### Stopping the Application

```bash
docker-compose down
```

To remove all data (including database):
```bash
docker-compose down -v
```

## Usage

1. **Sign Up**: Create a new account with username, email, and password
2. **Login**: Access your account
3. **Scan QR Code**: 
   - Click "Scan QR Code" button
   - Allow camera access
   - Scan a QR code or enter it manually (e.g., "product-01")
4. **Submit Report**:
   - Select stock status (Empty, Low Stock, In Stock)
   - Add optional notes
   - Upload an optional image
   - Submit the report
5. **View Reports**: Check all submitted reports with filters

## Project Structure

```
Fill-The-Shelf/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/    # React components
│       ├── App.js
│       ├── index.js
│       └── index.css
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   ├── middleware/       # Auth middleware
│   ├── db.js            # Database configuration
│   └── index.js         # Server entry point
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile           # Docker build instructions
└── package.json         # Server dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:qrCode` - Get product by QR code

### Reports
- `POST /api/reports` - Create stock report (with image upload)
- `GET /api/reports` - Get all reports
- `GET /api/reports/product/:qrCode` - Get reports for specific product

## Environment Variables

The application uses the following environment variables (configured in docker-compose.yml):

- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Application port
- `NODE_ENV` - Node environment

## Security Notes

⚠️ **Important**: Before deploying to production:
1. Change the `JWT_SECRET` in docker-compose.yml to a strong, random string
2. Change the database password
3. Use HTTPS for secure communication
4. Implement rate limiting
5. Add input validation and sanitization

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
