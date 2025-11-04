# Quick Start Guide

## 🚀 Fast Deployment

### Option 1: Automated Deployment (Recommended)

Run the deployment script:

```bash
./deploy.sh
```

This script will:
- Check if Docker and Docker Swarm are running
- Initialize Swarm if needed
- Create all required secrets automatically
- Deploy the entire stack

### Option 2: Manual Deployment

1. **Initialize Docker Swarm:**
   ```bash
   docker swarm init
   ```

2. **Create secrets:**
   ```bash
   echo "inventory_user" | docker secret create db_user -
   echo "your_secure_password" | docker secret create db_password -
   echo "your_jwt_secret_key" | docker secret create jwt_secret_key -
   ```

3. **Deploy the stack:**
   ```bash
   docker stack deploy -c docker-compose.yml inventory
   ```

4. **Check status:**
   ```bash
   docker service ls
   ```

## 📱 Using the Application

1. **Access the app:** Open `http://localhost` in your browser

2. **Create an account:** Click "Sign Up" and create a user

3. **Scan products:** 
   - Click "Scan Product"
   - Allow camera access
   - Scan a QR code
   - Fill in the status and notes
   - Optionally attach a photo
   - Submit

4. **View updates:** 
   - The Dashboard shows real-time updates
   - Filter by status
   - See who made updates and when

## 🔧 Common Commands

**View logs:**
```bash
docker service logs inventory_backend -f
```

**Scale services:**
```bash
docker service scale inventory_backend=5
```

**Update a service:**
```bash
docker service update --force inventory_backend
```

**Remove the stack:**
```bash
docker stack rm inventory
```

## 🧪 Testing QR Codes

If you don't have physical QR codes, you can:

1. Use an online QR code generator (e.g., qr-code-generator.com)
2. Generate codes with product identifiers like "PROD-001", "PROD-002", etc.
3. Display them on your phone or print them

## 🐛 Troubleshooting

**Services not starting:**
```bash
docker service ps inventory_backend --no-trunc
```

**Database connection issues:**
```bash
docker service logs inventory_db
```

**Can't access the application:**
- Ensure all services are running: `docker service ls`
- Check if port 80 is available
- Wait a minute for services to fully start

**WebSocket not connecting:**
- Check browser console for errors
- Ensure proxy service is running
- Verify nginx configuration

## 📦 Project Structure

```
/
├── docker-compose.yml          # Docker Swarm orchestration
├── deploy.sh                   # Automated deployment script
├── README.md                   # Full documentation
├── QUICKSTART.md              # This file
│
├── backend/                    # Python Flask backend
│   ├── app.py                 # Main application
│   ├── models.py              # Database models
│   ├── auth.py                # Authentication
│   ├── config.py              # Configuration
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile
│
├── frontend/                   # React PWA
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── api.js
│       ├── AuthContext.js
│       └── pages/
│
└── proxy/                      # Nginx reverse proxy
    ├── Dockerfile
    └── nginx.conf
```

## 🔐 Security Notes

- Change default secrets in production
- Use HTTPS in production (add SSL certificates to nginx)
- Set up proper firewall rules
- Use strong passwords
- Regularly update dependencies

## 📚 More Information

See `README.md` for complete documentation, including:
- Detailed architecture
- Configuration options
- Scaling strategies
- Monitoring
- Backup procedures
