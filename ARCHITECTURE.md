# System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS / CLIENTS                         │
│                    (Browser / Mobile / PWA)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS (Port 80)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY                         │
│                      (proxy service)                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   React App  │  │  API Proxy   │  │  WebSocket Proxy    │  │
│  │   (Static)   │  │  /api/*      │  │  /socket.io/*       │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
│  ┌──────────────┐                                              │
│  │   Uploads    │ Serves uploaded images from shared volume   │
│  │  /uploads/*  │                                              │
│  └──────────────┘                                              │
└────────────────────────┬───────────────────────┬────────────────┘
                         │                       │
                         ▼                       ▼
        ┌────────────────────────────────────────────────────┐
        │         FLASK BACKEND (3 replicas)                 │
        │           (backend service)                        │
        │                                                    │
        │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
        │  │ Auth Routes  │  │  API Routes  │  │SocketIO │ │
        │  │  /api/auth   │  │  /api/*      │  │ Events  │ │
        │  └──────────────┘  └──────────────┘  └─────────┘ │
        │                                                    │
        │  ┌──────────────────────────────────────────────┐ │
        │  │  File Upload Handler (Saves to /app/uploads)│ │
        │  └──────────────────────────────────────────────┘ │
        └────────────────────────┬──────────────────────────┘
                                 │
                                 ▼
                ┌────────────────────────────────┐
                │     POSTGRESQL DATABASE        │
                │        (db service)            │
                │                                │
                │  ┌──────────────────────────┐  │
                │  │   Tables:                │  │
                │  │   - users                │  │
                │  │   - products             │  │
                │  │   - stock_updates        │  │
                │  └──────────────────────────┘  │
                └────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER VOLUMES                               │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │   db-data            │    │   uploads-data       │          │
│  │  (PostgreSQL data)   │    │  (User images)       │          │
│  │  Mounted to: db      │    │  Mounted to:         │          │
│  │  /var/lib/postgresql │    │  - backend:/app/     │          │
│  │                      │    │  - proxy:/usr/share/ │          │
│  └──────────────────────┘    └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DOCKER SECRETS                               │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐        │
│  │  db_user    │  │ db_password │  │ jwt_secret_key   │        │
│  │  (username) │  │  (password) │  │  (JWT signing)   │        │
│  └─────────────┘  └─────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Client Layer (React PWA)

**Technology**: React 18 + PWA

**Components**:
- `LoginPage` - Authentication UI
- `ScanPage` - QR scanner + form
- `DashboardPage` - Real-time feed

**Features**:
- Progressive Web App (installable)
- Service Worker for offline support
- HTML5 QR code scanning
- Socket.IO client for real-time updates
- JWT authentication with auto-retry

### 2. Proxy Layer (Nginx)

**Technology**: Nginx 1.27

**Responsibilities**:
- Serve React static files
- Reverse proxy for API requests
- WebSocket proxy for Socket.IO
- Serve uploaded images
- SSL termination (future)
- Load balancing across backend replicas

**Routes**:
```
/              → React App (SPA)
/api/*         → Backend (REST API)
/socket.io/*   → Backend (WebSocket)
/uploads/*     → Static files (Shared volume)
```

### 3. Application Layer (Flask Backend)

**Technology**: Flask + Gunicorn + Gevent

**Components**:

**app.py**
- Main application entry
- SocketIO initialization
- Route definitions
- File upload handling
- Database initialization

**auth.py**
- User registration
- User login
- JWT token generation
- Password hashing

**models.py**
- User model
- Product model
- StockUpdate model
- Relationships

**config.py**
- Environment configuration
- Docker secrets reading
- Database URI construction

**API Endpoints**:
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
GET    /api/updates          - Get all updates
POST   /api/updates          - Create update (multipart)
GET    /api/products         - Get all products
```

**WebSocket Events**:
```
connect        - Client connected
disconnect     - Client disconnected
new_update     - Broadcast new update to all clients
```

### 4. Data Layer (PostgreSQL)

**Technology**: PostgreSQL 16 Alpine

**Tables**:

**users**
```sql
id              SERIAL PRIMARY KEY
username        VARCHAR(80) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
```

**products**
```sql
id              SERIAL PRIMARY KEY
qr_identifier   VARCHAR(255) UNIQUE NOT NULL
name            VARCHAR(255) NOT NULL
created_at      TIMESTAMP DEFAULT NOW()
```

**stock_updates**
```sql
id              SERIAL PRIMARY KEY
timestamp       TIMESTAMP DEFAULT NOW()
status          VARCHAR(50) NOT NULL
notes           TEXT
image_url       VARCHAR(255)
user_id         INTEGER REFERENCES users(id)
product_id      INTEGER REFERENCES products(id)
```

## Data Flow Diagrams

### User Registration Flow

```
Client                 Nginx                Backend              Database
  │                      │                      │                    │
  │ POST /api/auth/     │                      │                    │
  │    register         │                      │                    │
  ├────────────────────>│                      │                    │
  │                      │ Proxy to backend    │                    │
  │                      ├─────────────────────>│                    │
  │                      │                      │ Validate data      │
  │                      │                      │ Hash password      │
  │                      │                      │ Create user        │
  │                      │                      ├───────────────────>│
  │                      │                      │                    │ INSERT
  │                      │                      │<───────────────────┤
  │                      │                      │ Generate JWT       │
  │                      │ {token, user}        │                    │
  │                      │<─────────────────────┤                    │
  │ {token, user}        │                      │                    │
  │<─────────────────────┤                      │                    │
  │ Store token          │                      │                    │
  │ Redirect to /        │                      │                    │
```

### Create Stock Update Flow

```
Client            Nginx           Backend         Database      All Clients
  │                 │                 │                │               │
  │ POST /api/      │                 │                │               │
  │  updates        │                 │                │               │
  │ (FormData)      │                 │                │               │
  ├────────────────>│                 │                │               │
  │                 │ Proxy           │                │               │
  │                 ├────────────────>│                │               │
  │                 │                 │ Verify JWT     │               │
  │                 │                 │ Parse FormData │               │
  │                 │                 │ Save image     │               │
  │                 │                 │ Find/Create    │               │
  │                 │                 │   Product      │               │
  │                 │                 ├───────────────>│               │
  │                 │                 │                │ INSERT/SELECT │
  │                 │                 │<───────────────┤               │
  │                 │                 │ Create Update  │               │
  │                 │                 ├───────────────>│               │
  │                 │                 │                │ INSERT        │
  │                 │                 │<───────────────┤               │
  │                 │                 │                │               │
  │                 │                 │ Emit Socket.IO │               │
  │                 │                 │  "new_update"  │               │
  │                 │                 ├───────────────────────────────>│
  │                 │ {success}       │                │               │
  │                 │<────────────────┤                │               │
  │ {success}       │                 │                │               │
  │<────────────────┤                 │                │               │
  │ Redirect to /   │                 │                │               │
  │                 │                 │                │     Update UI │
  │                 │                 │                │     with new  │
  │                 │                 │                │      data     │
```

### Real-time Dashboard Update Flow

```
Client A          Nginx         Backend         Client B
  │                 │               │               │
  │ WebSocket       │               │               │ WebSocket
  │  connect        │               │               │  connect
  ├────────────────>│               │               │
  │                 ├──────────────>│               │
  │                 │               │<──────────────┤
  │                 │               │ Both clients  │
  │                 │               │  connected    │
  │                 │               │               │
  │ POST /api/      │               │               │
  │  updates        │               │               │
  ├────────────────>│               │               │
  │                 ├──────────────>│               │
  │                 │               │ Save to DB    │
  │                 │               │ Emit event    │
  │                 │               │ "new_update"  │
  │ Update arrives  │               ├──────────────>│ Update arrives
  │<────────────────┼───────────────┤               │
  │                 │               │               │
  │ UI updates      │               │               │ UI updates
  │ automatically   │               │               │ automatically
```

## Deployment Architecture

### Docker Swarm Cluster

```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER SWARM MANAGER                     │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                  SERVICES                          │    │
│  │                                                    │    │
│  │  proxy (1 replica)                                │    │
│  │  ├─ Task: proxy.1 (Running on Manager)           │    │
│  │                                                    │    │
│  │  backend (3 replicas)                             │    │
│  │  ├─ Task: backend.1 (Running on Manager)         │    │
│  │  ├─ Task: backend.2 (Running on Worker 1)        │    │
│  │  └─ Task: backend.3 (Running on Worker 2)        │    │
│  │                                                    │    │
│  │  db (1 replica)                                   │    │
│  │  └─ Task: db.1 (Running on Manager)              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                OVERLAY NETWORK                     │    │
│  │                                                    │    │
│  │  inventory-net (overlay, attachable)              │    │
│  │  ├─ proxy:80                                      │    │
│  │  ├─ backend:5000 (x3)                             │    │
│  │  └─ db:5432                                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                    VOLUMES                         │    │
│  │                                                    │    │
│  │  db-data (driver: local)                          │    │
│  │  uploads-data (driver: local, shared)             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                    SECRETS                         │    │
│  │                                                    │    │
│  │  db_user                                          │    │
│  │  db_password                                      │    │
│  │  jwt_secret_key                                   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Scaling Strategy

**Horizontal Scaling** (Backend):
```bash
docker service scale inventory_backend=5   # Scale to 5
docker service scale inventory_backend=10  # Scale to 10
```

**Vertical Scaling** (Resources):
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

## Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Backend validates against DB
   ↓
3. Generate JWT token (signed with secret)
   ↓
4. Return token to client
   ↓
5. Client stores in localStorage
   ↓
6. All requests include: Authorization: Bearer <token>
   ↓
7. Backend verifies token signature
   ↓
8. Extract user ID from token
   ↓
9. Process request with user context
```

### Secret Management

```
Docker Host
  ↓
Create secrets: echo "value" | docker secret create name -
  ↓
Swarm stores in encrypted Raft log
  ↓
Secrets mounted to containers at /run/secrets/<name>
  ↓
Backend reads from /run/secrets/
  ↓
Secrets never in environment variables or code
```

## Performance Optimizations

### Backend
- Gunicorn with gevent workers (async I/O)
- SQLAlchemy connection pooling
- JWT for stateless authentication
- Efficient ORM queries with eager loading

### Frontend
- Code splitting with React lazy loading
- Service worker for offline caching
- Debouncing for search/filter
- Image lazy loading
- Optimized bundle size

### Nginx
- Static file caching (1 year for assets)
- Gzip compression
- Connection keep-alive
- Buffer optimization

### Database
- Indexes on frequently queried fields
- Foreign key constraints
- Connection pooling

## Monitoring & Observability

**Logs**:
```bash
docker service logs inventory_backend -f    # Backend logs
docker service logs inventory_proxy -f      # Proxy logs
docker service logs inventory_db -f         # Database logs
```

**Metrics**:
```bash
docker stats                                # Resource usage
docker service ps inventory_backend         # Service status
```

**Health Checks**:
```bash
curl http://localhost/health                # Proxy health
curl http://localhost/api/health            # Backend health
```

## Network Topology

```
Internet
    │
    ▼
Firewall (Port 80)
    │
    ▼
Load Balancer (Nginx)
    │
    ├─────────────┬─────────────┐
    ▼             ▼             ▼
Backend-1    Backend-2    Backend-3
    │             │             │
    └─────────────┴─────────────┘
                  │
                  ▼
            PostgreSQL
```

## File Storage Architecture

```
Backend Replicas (3x)
    │
    ├─> /app/uploads (shared volume)
    │       │
    │       ├─ abc123.jpg
    │       ├─ def456.png
    │       └─ ...
    │
    └─> Database record: image_url="/uploads/abc123.jpg"

Nginx
    │
    └─> /usr/share/nginx/html/uploads (read-only mount)
            │
            └─> Serves images directly to clients
```

**Benefits**:
- Single source of truth (shared volume)
- Fast serving (Nginx static files)
- No duplication across replicas
- Persistent across container restarts

---

**This architecture provides**:
✅ High availability (multiple backend replicas)
✅ Scalability (horizontal scaling)
✅ Security (secrets, JWT, password hashing)
✅ Performance (caching, async I/O, pooling)
✅ Reliability (persistent volumes, health checks)
✅ Maintainability (clean separation of concerns)
