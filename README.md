# Fill The Shelf - Complete Project

A full-stack inventory management application with QR code scanning for stock reporting. Available as both a web application and native mobile app.

## 📦 Project Structure

```
Fill-The-Shelf/
├── web-app/           # React web app + Node.js backend
│   ├── client/        # React frontend
│   ├── server/        # Express API + PostgreSQL
│   ├── Dockerfile     # Multi-stage Docker build
│   └── docker-compose.yml
│
└── app/               # React Native mobile app (Expo)
    ├── app/           # Expo Router screens
    ├── contexts/      # Auth context
    ├── utils/         # API client
    └── constants/     # Config (API URL)
```

## 🚀 Quick Start

### Option 1: Run Web App (Docker - Easiest)

```bash
cd web-app
docker compose up --build
```

Visit: http://localhost:8080

### Option 2: Run Web App (Local Development)

```bash
# Terminal 1: Start PostgreSQL
cd web-app/postgres
docker compose up

# Terminal 2: Start backend + frontend
cd ..
npm install
cd client && npm install && cd ..
npm run dev
```

Backend: http://localhost:5000  
Frontend: http://localhost:3000

### Option 3: Run Mobile App

```bash
# 1. Start backend first (from web-app)
cd web-app
npm run dev

# 2. Start mobile app
cd ../app
npm install
npm start
```

Then scan QR code with Expo Go app, or press `i` for iOS / `a` for Android.

**Important:** Update `app/constants/api.ts` with your backend URL!

## 🎯 Features

### Core Functionality
- ✅ User authentication (signup/login with JWT)
- ✅ QR code scanning (browser HTML5 or native camera)
- ✅ Product lookup by QR code
- ✅ Stock reporting (empty, low, in-stock)
- ✅ Photo uploads for reports
- ✅ Notes for each report
- ✅ Dashboard with statistics
- ✅ Browse all products
- ✅ View and filter reports

### Web App Specific
- Docker deployment ready
- Responsive design
- Works on any modern browser
- HTML5 QR scanner

### Mobile App Specific
- Native camera QR scanning
- Photo capture from camera or gallery
- Offline-first authentication (AsyncStorage)
- Native UI components
- Push notifications (coming soon)

## 🛠️ Technology Stack

### Backend (Shared)
- Node.js + Express
- PostgreSQL database
- JWT authentication
- Multer (file uploads)
- Docker + Docker Compose

### Web Frontend
- React (Create React App)
- React Router
- Axios
- html5-qrcode

### Mobile Frontend
- React Native (Expo)
- Expo Router
- Expo Camera
- Expo Image Picker
- AsyncStorage

## 📱 Platform Support

| Platform | Web App | Mobile App |
|----------|---------|------------|
| iOS | ✅ Browser | ✅ Native |
| Android | ✅ Browser | ✅ Native |
| Windows | ✅ Browser | ❌ |
| macOS | ✅ Browser | ❌ |
| Web | ✅ | ⚠️ Limited* |

*Mobile app can run on web but camera features are limited.

## 🗄️ Database Schema

```sql
-- Users
users (id, username, email, password_hash, created_at)

-- Products
products (id, name, qr_code UNIQUE, description, created_at)

-- Stock Reports
stock_reports (
  id, product_id, user_id, status,
  notes, image_url, created_at
)
```

Sample products are automatically seeded:
- `product-01` - Coffee Beans
- `product-02` - Sugar Packets
- `product-03` - Paper Cups

## 🔐 Authentication Flow

1. **Signup** → Create account → Get JWT token
2. **Login** → Verify credentials → Get JWT token
3. **Token Storage**:
   - Web: `localStorage`
   - Mobile: `AsyncStorage`
4. **API Requests** → Include `Authorization: Bearer <token>` header
5. **Logout** → Clear token from storage

## 📡 API Endpoints

All endpoints require authentication except signup/login.

### Auth
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login

### Products
- `GET /api/products` - List all products
- `GET /api/products/:qrCode` - Get by QR code

### Reports
- `POST /api/reports` - Submit report (multipart/form-data)
- `GET /api/reports` - List all reports
- `GET /api/reports/product/:qrCode` - Reports for product

## 🐳 Docker Deployment

The web app includes complete Docker setup:

```bash
cd web-app
docker compose up --build
```

This starts:
- PostgreSQL database (port 5432)
- Node.js backend + React frontend (port 8080 → container 3000)

Images are pushed automatically on build.

## 📝 Configuration

### Web App Environment Variables

Create `web-app/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=filltheshelf
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key-change-in-production
```

### Mobile App Configuration

Edit `app/constants/api.ts`:

```typescript
// Development (emulator)
export const API_BASE_URL = 'http://localhost:5000';

// Physical device (replace with your IP)
export const API_BASE_URL = 'http://192.168.1.XXX:5000';

// Production
export const API_BASE_URL = 'https://api.yourserver.com';
```

## 🧪 Testing

### Test Credentials
```
Email: test@example.com
Password: password123
```

### Sample QR Codes
- `product-01` - Coffee Beans
- `product-02` - Sugar Packets
- `product-03` - Paper Cups

### Test Flow
1. Login/Signup
2. Scan QR code `product-01`
3. Fill report (status: Empty, notes: "Restocking needed")
4. Upload photo
5. Submit
6. View in Dashboard

## 🚧 Troubleshooting

### Web App Issues

**Port 3000 already in use:**
```bash
# Option 1: Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Option 2: Use different port
cd client
echo PORT=3001 > .env.local
npm start
```

**Database connection failed:**
```bash
# Check PostgreSQL is running
docker ps

# Or start standalone DB
cd web-app/postgres
docker compose up
```

### Mobile App Issues

**Cannot connect to server:**
- Check `API_BASE_URL` in `app/constants/api.ts`
- Use computer's IP address (not `localhost`) for physical devices
- Ensure backend is running: `cd web-app && npm run dev`
- Check firewall settings

**Camera not working:**
- Grant camera permissions
- iOS simulator doesn't have camera (use physical device)
- Android emulator needs camera enabled in settings

**Expo Go app shows error:**
```bash
# Clear cache
cd app
npm start -- --clear
```

## 📚 Documentation

- [Web App README](./web-app/README.md) - Detailed web setup
- [Web App Quickstart](./web-app/QUICKSTART.md) - Fast web setup
- [Mobile App README](./app/README.md) - Complete mobile guide
- [Mobile App Quickstart](./app/QUICKSTART.md) - Fast mobile setup
- [Architecture](./web-app/ARCHITECTURE.md) - System design
- [Troubleshooting](./web-app/TROUBLESHOOTING.md) - Common issues

## 🎓 Development Guide

### Adding a New Feature

1. **Backend:** Add route in `web-app/server/routes/`
2. **Web Frontend:** Add component in `web-app/client/src/components/`
3. **Mobile:** Add screen in `app/` (use Expo Router)
4. **Test:** Both platforms

### Code Style

- **TypeScript** for mobile (strict typing)
- **JavaScript** for web (ES6+)
- **Functional components** with hooks
- **Async/await** for API calls

## 🔜 Roadmap

- [ ] Offline mode (service workers + local storage)
- [ ] Push notifications for low stock
- [ ] Bulk QR code generation
- [ ] Report analytics and charts
- [ ] Export reports to CSV/PDF
- [ ] Dark mode theme
- [ ] Multi-language support
- [ ] Role-based access control

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check documentation in `web-app/` and `app/`
2. Search existing GitHub issues
3. Create new issue with:
   - Platform (web/mobile)
   - Environment (dev/prod)
   - Error messages
   - Steps to reproduce

---

**Happy coding! 🎉**
