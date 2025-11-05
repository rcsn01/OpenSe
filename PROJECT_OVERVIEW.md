# Fill The Shelf - Project Overview

## 🎯 Project Summary

Fill The Shelf is a full-stack stock management application that allows users to scan QR codes to track and report product stock levels. The application features a React frontend, Node.js/Express backend, and PostgreSQL database, all deployable with a single Docker Compose command.

## ✨ Key Features

### User Management
- **Sign Up**: New users can create accounts with username, email, and password
- **Login**: Secure authentication using JWT tokens
- **Session Management**: Persistent login sessions

### QR Code Scanning
- **Camera Scanning**: Use device camera to scan QR codes
- **Manual Entry**: Enter QR codes manually for testing or when camera is unavailable
- **Product Lookup**: Instant product information retrieval

### Stock Reporting
- **Status Selection**: Report stock as Empty, Low Stock, or In Stock
- **Notes**: Add detailed notes about stock conditions
- **Image Upload**: Attach photos to reports for visual documentation
- **History**: View all historical reports with filtering options

### Dashboard
- **Statistics**: Overview of total products and reports
- **Recent Activity**: Quick view of latest stock reports
- **Navigation**: Easy access to all features

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18.2.0
- React Router 6.20.1 (SPA navigation)
- html5-qrcode 2.3.8 (QR scanning)
- Axios 1.6.2 (HTTP client)

**Backend:**
- Node.js with Express 4.18.2
- PostgreSQL 15 (Alpine Linux)
- JWT for authentication
- Multer for file uploads
- bcrypt for password hashing

**Deployment:**
- Docker multi-stage builds
- Docker Compose orchestration
- Volume persistence for database and uploads

### Database Schema

**Users Table:**
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR, UNIQUE)
- email (VARCHAR, UNIQUE)
- password (VARCHAR, hashed)
- created_at (TIMESTAMP)
```

**Products Table:**
```sql
- id (SERIAL PRIMARY KEY)
- qr_code (VARCHAR, UNIQUE)
- name (VARCHAR)
- description (TEXT)
- created_at (TIMESTAMP)
```

**Stock Reports Table:**
```sql
- id (SERIAL PRIMARY KEY)
- product_id (INTEGER, FOREIGN KEY)
- user_id (INTEGER, FOREIGN KEY)
- status (VARCHAR: empty, low, in-stock)
- notes (TEXT)
- image_url (VARCHAR)
- created_at (TIMESTAMP)
```

## 📁 Project Structure

```
Fill-The-Shelf/
├── client/                     # React Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js   # Main dashboard
│   │   │   ├── Login.js       # Login page
│   │   │   ├── Signup.js      # Registration page
│   │   │   ├── Scanner.js     # QR scanner
│   │   │   ├── Reports.js     # Reports view
│   │   │   └── Navbar.js      # Navigation bar
│   │   ├── App.js             # Main app component
│   │   ├── index.js           # Entry point
│   │   └── index.css          # Global styles
│   └── package.json
│
├── server/                     # Node.js Backend
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── products.js        # Product routes
│   │   └── reports.js         # Report routes
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   ├── db.js                  # Database config & init
│   └── index.js               # Server entry point
│
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Multi-stage build
├── .dockerignore              # Docker ignore rules
├── .gitignore                 # Git ignore rules
├── .env                       # Environment variables
├── .env.example               # Env template
├── package.json               # Server dependencies
├── README.md                  # Full documentation
├── QUICKSTART.md              # Quick start guide
├── start.sh                   # Linux/Mac startup script
└── start.bat                  # Windows startup script
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
  - Body: `{ username, email, password }`
  - Returns: `{ user, token }`

- `POST /api/auth/login` - Login user
  - Body: `{ email, password }`
  - Returns: `{ user, token }`

### Products (Protected)
- `GET /api/products` - Get all products
  - Headers: `Authorization: Bearer <token>`
  - Returns: Array of products

- `GET /api/products/:qrCode` - Get product by QR code
  - Headers: `Authorization: Bearer <token>`
  - Returns: Single product

### Reports (Protected)
- `POST /api/reports` - Create stock report
  - Headers: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
  - Body: FormData with `{ qrCode, status, notes, image }`
  - Returns: Created report

- `GET /api/reports` - Get all reports
  - Headers: `Authorization: Bearer <token>`
  - Returns: Array of reports with product and user info

- `GET /api/reports/product/:qrCode` - Get reports for specific product
  - Headers: `Authorization: Bearer <token>`
  - Returns: Array of reports for the product

## 🚀 Deployment

### Single-Server Deployment

The application uses Docker Compose to orchestrate two services:

1. **PostgreSQL Database** (port 5432)
   - Alpine Linux base
   - Health checks
   - Persistent volume

2. **Application Server** (port 3000)
   - Multi-stage Docker build
   - Serves both API and static React files
   - Uploads volume for images

### Deployment Steps

1. **Install Docker** and Docker Compose

2. **Clone repository**:
   ```bash
   git clone <repo-url>
   cd Fill-The-Shelf
   ```

3. **Start application**:
   ```bash
   docker-compose up --build -d
   ```

4. **Access**: http://localhost:3000

5. **Stop application**:
   ```bash
   docker-compose down
   ```

## 🔒 Security Considerations

### Current Implementation
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Protected API routes
- ✅ File upload validation (type, size)
- ✅ SQL injection protection (parameterized queries)

### Production Recommendations
- ⚠️ Change JWT_SECRET to strong random value
- ⚠️ Use HTTPS/TLS encryption
- ⚠️ Implement rate limiting
- ⚠️ Add CSRF protection
- ⚠️ Set up proper CORS policies
- ⚠️ Regular security updates
- ⚠️ Environment variable management
- ⚠️ Database backup strategy

## 📊 Sample Data

The application automatically creates sample products on first run:

- **product-01**: Product 1
- **product-02**: Product 2
- **product-03**: Product 3

These can be used for testing the QR scanner functionality.

## 🎨 UI/UX Features

- Modern gradient design
- Responsive layout
- Real-time QR code scanning
- Image preview before upload
- Status badges with color coding
- Filtering and sorting
- Loading states
- Error handling
- Success notifications

## 🧪 Testing the Application

1. **Create Account**: Sign up with any credentials
2. **Scan QR Code**: Use "product-01" in manual entry
3. **Submit Report**: Choose status, add notes, upload image
4. **View Dashboard**: See statistics update
5. **Check Reports**: Filter by status

## 🔄 Future Enhancements

Potential features to add:
- Product management (CRUD operations)
- User roles (admin, manager, staff)
- Analytics and charts
- Export reports to CSV/PDF
- Email notifications
- Mobile app (React Native)
- Barcode support
- Multi-language support
- Dark mode
- Real-time updates (WebSocket)

## 📝 License

ISC License - Free to use and modify

## 👥 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For issues, questions, or feature requests:
- Create an issue in the repository
- Check existing documentation
- Review API endpoints
- Check Docker logs

---

**Built with ❤️ using React, Node.js, PostgreSQL, and Docker**
