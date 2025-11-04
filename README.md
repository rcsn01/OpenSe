# Inventory Status Reporting System

A comprehensive real-time inventory management system built with Flask, React, PostgreSQL, and deployed using Docker Swarm.

## Features

- **User Authentication:** Secure signup and login with JWT tokens
- **QR Code Scanning:** Scan products to quickly identify and update inventory
- **Status Tracking:** Track product status (Out of Stock, Near Out of Stock, Ordered, Restocked)
- **Rich Updates:** Add notes and images to status updates
- **Real-time Dashboard:** Live feed of all inventory updates using WebSockets
- **Progressive Web App:** Installable mobile-first interface

## Tech Stack

- **Frontend:** React PWA with react-router-dom, html5-qrcode, socket.io-client
- **Backend:** Flask with Flask-SocketIO, Flask-SQLAlchemy, Flask-JWT-Extended
- **Database:** PostgreSQL 16
- **Proxy:** Nginx
- **Deployment:** Docker Swarm

## Prerequisites

- Docker and Docker Compose installed
- Docker Swarm initialized

## Deployment Instructions

### 1. Initialize Docker Swarm

If you haven't already initialized Swarm mode:

```bash
docker swarm init
```

### 2. Create Docker Secrets

Create the required secrets for secure credential management:

```bash
# Database user
echo "inventory_user" | docker secret create db_user -

# Database password (use a strong password in production)
echo "your_secure_db_password_here" | docker secret create db_password -

# JWT secret key (use a strong random string in production)
echo "your_jwt_secret_key_here_change_this_to_random_string" | docker secret create jwt_secret_key -
```

**Important:** Replace the example values with strong, randomly generated secrets in production.

### 3. Deploy the Stack

Deploy the application stack to Docker Swarm:

```bash
docker stack deploy -c docker-compose.yml inventory
```

### 4. Verify Deployment

Check that all services are running:

```bash
docker service ls
```

You should see three services:
- `inventory_proxy` (1 replica)
- `inventory_backend` (3 replicas)
- `inventory_db` (1 replica)

Check service logs:

```bash
# View backend logs
docker service logs inventory_backend

# View proxy logs
docker service logs inventory_proxy

# View database logs
docker service logs inventory_db
```

### 5. Access the Application

Once all services are running, access the application at:

```
http://localhost
```

Or use your server's IP address if deploying remotely.

## Scaling

### Scale Backend Services

To handle more traffic, scale the backend service:

```bash
# Scale to 5 replicas
docker service scale inventory_backend=5

# Scale to 10 replicas
docker service scale inventory_backend=10
```

### Scale Down

```bash
# Scale back to 3 replicas
docker service scale inventory_backend=3
```

## Management Commands

### Update Services

After making code changes, rebuild and update:

```bash
# Update the backend service
docker service update --force inventory_backend

# Update the proxy service
docker service update --force inventory_proxy
```

### Remove the Stack

To completely remove the application:

```bash
docker stack rm inventory
```

**Note:** This does not remove volumes or secrets.

### Remove Volumes

To remove all data (use with caution):

```bash
docker volume rm inventory_db-data inventory_uploads-data
```

### Remove Secrets

To remove secrets:

```bash
docker secret rm db_user db_password jwt_secret_key
```

## Development

### Local Development Setup

For local development without Swarm:

```bash
# Backend
cd backend
pip install -r requirements.txt
python app.py

# Frontend
cd frontend
npm install
npm start
```

## Project Structure

```
/
├── docker-compose.yml       # Docker Swarm orchestration
├── README.md
├── backend/                 # Flask backend
│   ├── app.py              # Main application
│   ├── models.py           # Database models
│   ├── auth.py             # Authentication blueprint
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile
├── frontend/               # React PWA
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── api.js
│       ├── AuthContext.js
│       └── pages/
│           ├── LoginPage.js
│           ├── ScanPage.js
│           └── DashboardPage.js
└── proxy/                  # Nginx reverse proxy
    ├── Dockerfile
    └── nginx.conf
```

## Security Notes

- Always use strong, randomly generated secrets in production
- Keep secrets secure and never commit them to version control
- Use HTTPS in production (configure SSL certificates in Nginx)
- Regularly update dependencies and base images
- Implement rate limiting for API endpoints
- Set up proper database backups

## Monitoring

Monitor service health:

```bash
# Check service status
docker service ps inventory_backend

# View resource usage
docker stats

# Inspect a service
docker service inspect inventory_backend
```

## Troubleshooting

### Services Not Starting

```bash
# Check service logs
docker service logs inventory_backend --tail 100 --follow

# Check if secrets are created
docker secret ls
```

### Database Connection Issues

```bash
# Verify database is running
docker service ps inventory_db

# Check database logs
docker service logs inventory_db
```

### Volume Issues

```bash
# List volumes
docker volume ls

# Inspect a volume
docker volume inspect inventory_uploads-data
```

## License

MIT License - feel free to use this project for your own purposes.
