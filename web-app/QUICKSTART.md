# Quick Start Guide

## Running the Application

### Option 1: Using Docker (Recommended)

1. **Start the application**:
   ```bash
   docker-compose up --build
   ```

2. **Access the application**:
   - Open your browser and go to: `http://localhost:3000`

3. **Stop the application**:
   ```bash
   docker-compose down
   ```

### Option 2: Local Development (Without Docker)

#### Prerequisites
- Node.js 18+ installed
- PostgreSQL installed and running

#### Steps

1. **Set up the database**:
   - Create a PostgreSQL database named `filltheshelf`
   - Update `.env` file with your database credentials

2. **Install dependencies**:
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Run in development mode**:
   ```bash
   # Start both backend and frontend
   npm run dev
   ```
   
   Or run them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run client
   ```

4. **Access the application**:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## First Time Setup

1. **Create an account**:
   - Click "Sign up"
   - Enter username, email, and password
   - Click "Sign Up"

2. **Try scanning**:
   - Click "Scan QR Code" in the navigation
   - Try manual entry with: `product-01`, `product-02`, or `product-03`
   - Or scan an actual QR code containing these values

3. **Submit a report**:
   - Select stock status
   - Add notes (optional)
   - Upload image (optional)
   - Click "Submit Report"

## Generating QR Codes for Testing

You can generate QR codes for testing using online tools:

1. Go to: https://www.qr-code-generator.com/
2. Enter text: `product-01` (or `product-02`, `product-03`)
3. Download and print or display on another device
4. Scan with the app!

## Troubleshooting

### Docker Issues

**Container won't start**:
```bash
docker-compose down -v
docker-compose up --build
```

**Database connection error**:
- Wait a few seconds for PostgreSQL to fully initialize
- Check logs: `docker-compose logs db`

### Local Development Issues

**Port already in use**:
- Change PORT in `.env` file
- Kill the process using the port

**Database connection error**:
- Ensure PostgreSQL is running
- Check credentials in `.env` file
- Verify database exists: `psql -U postgres -l`

**Module not found**:
```bash
rm -rf node_modules client/node_modules
npm install
cd client && npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=filltheshelf
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
NODE_ENV=development
```

For Docker, these are configured in `docker-compose.yml`.

## Production Deployment

1. Update `docker-compose.yml`:
   - Change `JWT_SECRET` to a strong random string
   - Change database password
   - Add volume mounts for persistent data

2. Build and run:
   ```bash
   docker-compose up -d
   ```

3. Set up reverse proxy (nginx/Apache) for HTTPS

4. Configure firewall to allow only ports 80 and 443

## Need Help?

- Check the main README.md for detailed documentation
- Review API endpoints in README.md
- Check server logs: `docker-compose logs app`
- Check database logs: `docker-compose logs db`
