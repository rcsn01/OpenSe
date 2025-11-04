# Troubleshooting Guide

Common issues and their solutions for the Inventory Status Reporting System.

## 🔍 Quick Diagnostics

Run these commands first to gather information:

```bash
# Check all services
docker service ls

# Check service details
docker service ps inventory_backend --no-trunc
docker service ps inventory_db --no-trunc
docker service ps inventory_proxy --no-trunc

# Check logs
docker service logs inventory_backend --tail 100
docker service logs inventory_db --tail 100
docker service logs inventory_proxy --tail 100

# Check networks
docker network ls | grep inventory

# Check volumes
docker volume ls | grep inventory

# Check secrets
docker secret ls
```

---

## 🚨 Common Issues & Solutions

### 1. Services Won't Start

**Symptom:** Services show 0/3 replicas or keep restarting

**Diagnosis:**
```bash
docker service ps inventory_backend --no-trunc
# Look for error messages in "Error" column
```

**Common Causes & Solutions:**

#### A. Docker Swarm Not Initialized
```bash
# Check swarm status
docker info | grep Swarm

# If "Swarm: inactive", initialize it
docker swarm init
```

#### B. Missing Secrets
```bash
# Check if secrets exist
docker secret ls

# Create missing secrets
echo "inventory_user" | docker secret create db_user -
openssl rand -base64 32 | docker secret create db_password -
openssl rand -base64 48 | docker secret create jwt_secret_key -

# Redeploy
docker stack deploy -c docker-compose.yml inventory
```

#### C. Port Already in Use
```bash
# Check what's using port 80
lsof -i :80

# Kill the process or change port in docker-compose.yml
```

#### D. Image Build Failed
```bash
# Remove stack
docker stack rm inventory

# Build images manually
cd backend && docker build -t inventory-backend .
cd ../proxy && docker build -t inventory-proxy .

# Redeploy
docker stack deploy -c docker-compose.yml inventory
```

---

### 2. Database Connection Errors

**Symptom:** Backend logs show "could not connect to server" or "connection refused"

**Diagnosis:**
```bash
docker service logs inventory_backend | grep -i "database\|postgres\|connection"
docker service logs inventory_db | grep -i "ready\|error"
```

**Solutions:**

#### A. Database Not Ready
```bash
# Wait for database to be ready
docker service logs inventory_db --tail 20
# Look for "database system is ready to accept connections"

# If not ready, wait 30 seconds and check again
sleep 30 && docker service logs inventory_db --tail 20
```

#### B. Wrong Credentials
```bash
# Check secrets
docker secret inspect db_user
docker secret inspect db_password

# Recreate if wrong
docker secret rm db_user db_password
echo "inventory_user" | docker secret create db_user -
echo "your_password" | docker secret create db_password -

# Update service
docker service update --force inventory_backend
```

#### C. Database Container Issues
```bash
# Check database service
docker service ps inventory_db

# If failing, remove and redeploy
docker stack rm inventory
docker volume rm inventory_db-data  # WARNING: Deletes all data!
docker stack deploy -c docker-compose.yml inventory
```

---

### 3. Application Not Accessible (404 or Connection Refused)

**Symptom:** Cannot access http://localhost or getting 404 errors

**Diagnosis:**
```bash
# Check if proxy is running
docker service ps inventory_proxy

# Check proxy logs
docker service logs inventory_proxy --tail 50

# Test from command line
curl -I http://localhost
```

**Solutions:**

#### A. Proxy Service Not Running
```bash
# Check service status
docker service ls | grep proxy

# If 0/1 replicas, check why
docker service ps inventory_proxy --no-trunc

# Update service
docker service update --force inventory_proxy
```

#### B. Port Not Exposed
```bash
# Verify port mapping
docker service inspect inventory_proxy | grep -A 5 "Ports"

# Should show:
# "PublishedPort": 80

# If missing, check docker-compose.yml
```

#### C. Firewall Blocking
```bash
# On macOS
sudo pfctl -s all | grep 80

# On Linux
sudo iptables -L | grep 80

# Temporarily disable firewall to test
# macOS: System Preferences → Security → Firewall
# Linux: sudo ufw disable  (remember to re-enable!)
```

---

### 4. Real-time Updates Not Working

**Symptom:** New updates don't appear automatically on dashboard

**Diagnosis:**
```bash
# Check browser console (F12)
# Look for WebSocket errors

# Check backend logs
docker service logs inventory_backend | grep -i "socket\|websocket"
```

**Solutions:**

#### A. WebSocket Connection Failed
**Browser Console shows: "WebSocket connection failed"**

```bash
# Check nginx WebSocket config
docker exec $(docker ps -qf name=inventory_proxy) cat /etc/nginx/conf.d/nginx.conf | grep -A 10 "socket.io"

# Should have:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";
```

**Fix:** Ensure nginx.conf has correct WebSocket headers (already included in provided files)

#### B. CORS Issues
**Browser Console shows: "CORS error"**

```bash
# Check backend CORS config
docker service logs inventory_backend | grep -i cors

# Backend should have:
# CORS(app, resources={r"/*": {"origins": "*"}})
```

**Fix:** Already configured in app.py

#### C. Multiple Backend Replicas Not Broadcasting
**Updates work sometimes but not always**

```bash
# This is expected with Socket.IO and multiple replicas
# Solution: Add Redis adapter (advanced)

# Quick fix: Scale to 1 replica for testing
docker service scale inventory_backend=1
```

**Proper Fix (Production):**
Add Redis pub/sub to backend (requires code modification)

---

### 5. Image Upload Fails

**Symptom:** Image upload returns error or images don't display

**Diagnosis:**
```bash
# Check uploads volume
docker volume inspect inventory_uploads-data

# Check backend logs
docker service logs inventory_backend | grep -i "upload\|image\|file"

# Check uploaded files
docker exec $(docker ps -qf name=inventory_backend) ls -la /app/uploads
```

**Solutions:**

#### A. Volume Not Mounted
```bash
# Check volume mounts
docker service inspect inventory_backend | grep -A 5 "Mounts"

# Should show:
# "Target": "/app/uploads"

# Redeploy if missing
docker stack rm inventory
docker stack deploy -c docker-compose.yml inventory
```

#### B. Permission Issues
```bash
# Fix permissions in container
docker exec $(docker ps -qf name=inventory_backend) chmod 777 /app/uploads
```

#### C. File Size Too Large
**Error: "413 Request Entity Too Large"**

```bash
# Check nginx config
docker exec $(docker ps -qf name=inventory_proxy) cat /etc/nginx/conf.d/nginx.conf | grep client_max_body_size

# Should show: client_max_body_size 16M;
```

**Fix:** Already configured in nginx.conf

#### D. Images Not Served by Nginx
**Images upload but 404 when accessing**

```bash
# Check nginx uploads mount
docker service inspect inventory_proxy | grep -A 5 "Mounts"

# Should show:
# "Target": "/usr/share/nginx/html/uploads"

# Test manually
curl -I http://localhost/uploads/test.jpg
```

---

### 6. JWT Token Issues

**Symptom:** "Invalid token" or "Token expired" errors

**Diagnosis:**
```bash
# Check JWT secret
docker secret inspect jwt_secret_key

# Check backend logs
docker service logs inventory_backend | grep -i jwt
```

**Solutions:**

#### A. Token Expired
**Error: "Token has expired"**

```bash
# Normal behavior after 24 hours
# User needs to log in again
# Or increase expiry in config.py:
# JWT_ACCESS_TOKEN_EXPIRES = 86400 * 7  # 7 days
```

#### B. JWT Secret Changed
**Error: "Signature verification failed"**

```bash
# This happens if jwt_secret_key was changed after tokens were issued
# Users need to log in again
# Clear localStorage in browser:
localStorage.clear()
```

#### C. JWT Secret Not Set
```bash
# Check if secret exists
docker secret ls | grep jwt_secret_key

# Create if missing
openssl rand -base64 48 | docker secret create jwt_secret_key -

# Restart backend
docker service update --force inventory_backend
```

---

### 7. QR Scanner Not Working

**Symptom:** Camera doesn't start or scanner doesn't detect codes

**Solutions:**

#### A. Camera Permission Denied
- Click "Allow" when browser asks for camera permission
- On mobile: Check app/browser permissions in system settings

#### B. HTTPS Required
- Most browsers require HTTPS for camera access (except localhost)
- For production, add SSL certificate to nginx

#### C. Wrong QR Format
- Scanner expects text-based QR codes
- Generate QR codes with simple text (e.g., "PROD-001")

#### D. Poor Lighting
- Ensure good lighting conditions
- Clean camera lens
- Hold QR code steady

---

### 8. Performance Issues

**Symptom:** Slow response times, high CPU/memory usage

**Diagnosis:**
```bash
# Check resource usage
docker stats

# Check service replicas
docker service ls

# Check database queries
docker service logs inventory_backend | grep -i "select\|query"
```

**Solutions:**

#### A. Too Few Backend Replicas
```bash
# Scale up backend
docker service scale inventory_backend=5

# Check improvement
docker stats
```

#### B. Database Query Inefficiency
```bash
# Add indexes (already included in models.py)
# Use eager loading for relationships (already implemented)
```

#### C. Too Many Logs
```bash
# Limit log output in production
# Edit backend Dockerfile:
# CMD [..., "--access-logfile", "/dev/null"]
```

#### D. Memory Leak
```bash
# Check for continuously growing memory
docker stats

# Restart services
docker service update --force inventory_backend
```

---

### 9. Build Errors

**Symptom:** "docker build" or "docker stack deploy" fails

**Solutions:**

#### A. Frontend Build Fails
```bash
# Check Node.js version
docker run --rm node:20-alpine node --version

# Build manually to see errors
cd frontend
npm install
npm run build

# Check for missing dependencies
```

#### B. Backend Build Fails
```bash
# Check Python version
docker run --rm python:3.11-slim python --version

# Build manually to see errors
cd backend
docker build -t test-backend .

# Check requirements.txt for typos
```

#### C. Proxy Build Fails
```bash
# Common issue: wrong COPY paths in Dockerfile
# Check that frontend is built first

# Fix: Use correct paths in proxy/Dockerfile
COPY ../frontend/package*.json ./
```

---

### 10. Data Loss

**Symptom:** Database or uploaded images are lost after restart

**Solutions:**

#### A. Volumes Not Persistent
```bash
# Check if volumes exist
docker volume ls | grep inventory

# If missing, they weren't created
# They should persist across stack removals

# Recreate with:
docker volume create inventory_db-data
docker volume create inventory_uploads-data
```

#### B. Volume Removed Accidentally
```bash
# Volumes only deleted with explicit command:
docker volume rm inventory_db-data

# PREVENTION: Never run this command!
# BACKUP regularly instead
```

#### C. Backup Not Working
**Backup database:**
```bash
docker exec $(docker ps -qf name=inventory_db) \
  pg_dump -U inventory_user inventory_db > backup_$(date +%Y%m%d).sql
```

**Restore database:**
```bash
cat backup_20250104.sql | \
  docker exec -i $(docker ps -qf name=inventory_db) \
  psql -U inventory_user inventory_db
```

**Backup uploads:**
```bash
docker run --rm \
  -v inventory_uploads-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz /data
```

---

## 🔧 Advanced Troubleshooting

### Debug Mode

**Enable debug logging in backend:**

Edit `backend/app.py`:
```python
# Change
app.config['DEBUG'] = False

# To
app.config['DEBUG'] = True
```

Redeploy:
```bash
docker service update --force inventory_backend
```

### Access Container Shell

```bash
# Backend
docker exec -it $(docker ps -qf name=inventory_backend) /bin/bash

# Database
docker exec -it $(docker ps -qf name=inventory_db) /bin/bash

# Proxy
docker exec -it $(docker ps -qf name=inventory_proxy) /bin/sh
```

### Check Database Directly

```bash
docker exec -it $(docker ps -qf name=inventory_db) \
  psql -U inventory_user -d inventory_db

# Inside psql:
\dt                    # List tables
SELECT * FROM users;   # View users
SELECT * FROM stock_updates ORDER BY timestamp DESC LIMIT 10;
\q                     # Quit
```

### Network Debugging

```bash
# Inspect overlay network
docker network inspect inventory-net

# Check service connectivity
docker exec $(docker ps -qf name=inventory_backend) ping db
docker exec $(docker ps -qf name=inventory_backend) nc -zv db 5432
```

### Reset Everything

**⚠️ WARNING: This deletes ALL data!**

```bash
# Remove stack
docker stack rm inventory

# Wait for removal
sleep 10

# Remove volumes
docker volume rm inventory_db-data inventory_uploads-data

# Remove secrets (optional)
docker secret rm db_user db_password jwt_secret_key

# Clean system
docker system prune -f

# Redeploy fresh
./deploy.sh
```

---

## 📞 Getting Help

### Information to Gather

When seeking help, provide:

1. **System Information:**
   ```bash
   docker version
   docker info | grep -E "Server Version|Swarm"
   uname -a  # On Linux/Mac
   ```

2. **Service Status:**
   ```bash
   docker service ls
   docker service ps inventory_backend --no-trunc
   ```

3. **Logs:**
   ```bash
   docker service logs inventory_backend --tail 100 > backend.log
   docker service logs inventory_db --tail 100 > db.log
   docker service logs inventory_proxy --tail 100 > proxy.log
   ```

4. **Configuration:**
   ```bash
   cat docker-compose.yml
   docker secret ls
   docker network ls
   docker volume ls
   ```

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "no such host" | DNS resolution failed | Check service names in docker-compose.yml |
| "connection refused" | Service not listening | Check service is running and ports |
| "permission denied" | File/volume permission issue | Fix with chmod/chown |
| "address already in use" | Port conflict | Change port or stop conflicting service |
| "no space left on device" | Disk full | Clean up: `docker system prune` |
| "service ... not found" | Service name typo | Check `docker service ls` |

---

## ✅ Prevention Best Practices

1. **Regular Backups**
   - Database: Daily
   - Uploads: Weekly
   - Automate with cron

2. **Monitor Resources**
   ```bash
   docker stats
   ```

3. **Keep Logs Under Control**
   - Rotate logs
   - Limit log size

4. **Update Regularly**
   - Update base images
   - Update dependencies
   - Test updates in staging first

5. **Use Health Checks**
   - Already included for database
   - Add for backend if needed

6. **Document Changes**
   - Keep change log
   - Document custom modifications

---

**Still having issues? Check the logs first, they usually tell you exactly what's wrong!**
