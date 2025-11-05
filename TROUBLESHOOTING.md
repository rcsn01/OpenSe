# Troubleshooting Guide

## Common Issues and Solutions

### Docker Issues

#### Issue: "Cannot connect to the Docker daemon"

**Symptoms:**
```
ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**
1. Start Docker Desktop (Windows/Mac)
2. On Linux: `sudo systemctl start docker`
3. Verify Docker is running: `docker info`

---

#### Issue: "Port 3000 is already in use"

**Symptoms:**
```
Error starting userland proxy: listen tcp 0.0.0.0:3000: bind: address already in use
```

**Solution:**

**Windows:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Or change the port in docker-compose.yml:**
```yaml
app:
  ports:
    - "8080:3000"  # Use port 8080 on host
```

---

#### Issue: Database initialization fails

**Symptoms:**
```
Error: relation "users" does not exist
```

**Solution:**
```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Rebuild and restart
docker-compose up --build
```

---

#### Issue: "No space left on device"

**Symptoms:**
```
ERROR: No space left on device
```

**Solution:**
```bash
# Clean up Docker
docker system prune -a --volumes

# Remove unused images
docker image prune -a

# Check Docker disk usage
docker system df
```

---

### Application Issues

#### Issue: "Cannot scan QR codes"

**Symptoms:**
- Camera doesn't start
- Permission denied

**Solution:**
1. **Check browser permissions:**
   - Chrome: Click lock icon → Site settings → Camera → Allow
   - Firefox: Click shield icon → Permissions → Camera → Allow

2. **Use HTTPS (for production):**
   - Camera API requires HTTPS in production
   - Use localhost for development (works with HTTP)

3. **Try manual entry:**
   - Use the manual QR code input field
   - Enter: `product-01`, `product-02`, or `product-03`

---

#### Issue: "Image upload fails"

**Symptoms:**
```
Error: File too large
Error: Invalid file type
```

**Solution:**
1. **Check file size:**
   - Maximum: 5MB
   - Compress image before upload

2. **Check file type:**
   - Allowed: JPEG, JPG, PNG, GIF
   - Convert other formats

3. **Verify uploads directory exists:**
   ```bash
   docker-compose exec app ls -la uploads/
   ```

---

#### Issue: "Login fails / Token invalid"

**Symptoms:**
- "Invalid token" error
- Automatic logout after refresh

**Solution:**
1. **Clear browser storage:**
   ```javascript
   // Open browser console (F12) and run:
   localStorage.clear()
   ```

2. **Check JWT_SECRET consistency:**
   - Ensure it's the same in docker-compose.yml
   - Don't change it after users sign up

3. **Verify token expiration:**
   - Tokens expire after 7 days
   - Log in again

---

#### Issue: "Product not found"

**Symptoms:**
```
Error: Product not found
```

**Solution:**
1. **Check QR code format:**
   - Exact match required
   - Case-sensitive
   - No extra spaces

2. **Verify products exist in database:**
   ```bash
   docker-compose exec db psql -U postgres -d filltheshelf -c "SELECT * FROM products;"
   ```

3. **Add products manually:**
   ```sql
   INSERT INTO products (qr_code, name, description) 
   VALUES ('product-04', 'Product 4', 'New product');
   ```

---

### Database Issues

#### Issue: "Database connection refused"

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
1. **Wait for database to start:**
   ```bash
   docker-compose logs db
   # Wait for: "database system is ready to accept connections"
   ```

2. **Check database health:**
   ```bash
   docker-compose ps
   # db should be "healthy"
   ```

3. **Restart database container:**
   ```bash
   docker-compose restart db
   ```

---

#### Issue: "Too many connections"

**Symptoms:**
```
Error: sorry, too many clients already
```

**Solution:**
1. **Restart database:**
   ```bash
   docker-compose restart db
   ```

2. **Increase max connections (docker-compose.yml):**
   ```yaml
   db:
     command: postgres -c max_connections=200
   ```

---

### Frontend Issues

#### Issue: "Blank white screen"

**Symptoms:**
- Application shows white screen
- No errors in console

**Solution:**
1. **Check browser console (F12):**
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Clear cache in browser settings

3. **Rebuild frontend:**
   ```bash
   docker-compose down
   docker-compose up --build
   ```

---

#### Issue: "API requests fail with CORS error"

**Symptoms:**
```
Access to fetch at 'http://localhost:5000/api/auth/login' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Solution:**
- In production, app serves both frontend and API (no CORS issues)
- In development, proxy is configured in client/package.json
- Verify: `"proxy": "http://localhost:5000"` exists in client/package.json

---

### Performance Issues

#### Issue: "Application is slow"

**Solutions:**

1. **Check Docker resources:**
   - Docker Desktop → Settings → Resources
   - Increase CPU/Memory allocation

2. **Check database size:**
   ```bash
   docker-compose exec db psql -U postgres -d filltheshelf -c "\dt+"
   ```

3. **Clean up old reports:**
   ```sql
   DELETE FROM stock_reports WHERE created_at < NOW() - INTERVAL '90 days';
   ```

4. **Optimize images:**
   - Compress uploads folder images
   - Delete unused images

---

### Development Issues

#### Issue: "Changes not reflecting"

**Symptoms:**
- Code changes don't appear in running app

**Solution:**

**For Docker:**
```bash
# Rebuild containers
docker-compose down
docker-compose up --build
```

**For local development:**
```bash
# Frontend (client folder)
cd client
rm -rf node_modules build
npm install
npm start

# Backend (root folder)
rm -rf node_modules
npm install
npm run server
```

---

#### Issue: "Module not found"

**Symptoms:**
```
Error: Cannot find module 'express'
```

**Solution:**

**In Docker:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

**Local development:**
```bash
# Root
npm install

# Client
cd client
npm install
```

---

## Debugging Commands

### Check Logs

```bash
# All logs
docker-compose logs

# Specific service
docker-compose logs app
docker-compose logs db

# Follow logs (real-time)
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

### Access Containers

```bash
# App container
docker-compose exec app sh

# Database container
docker-compose exec db psql -U postgres -d filltheshelf

# List files in app container
docker-compose exec app ls -la
```

### Database Queries

```bash
# Connect to database
docker-compose exec db psql -U postgres -d filltheshelf

# Useful queries:
# List all users
SELECT id, username, email FROM users;

# List all products
SELECT * FROM products;

# List recent reports
SELECT sr.*, p.name, u.username 
FROM stock_reports sr 
JOIN products p ON sr.product_id = p.id 
JOIN users u ON sr.user_id = u.id 
ORDER BY sr.created_at DESC LIMIT 10;

# Count reports by status
SELECT status, COUNT(*) FROM stock_reports GROUP BY status;
```

### Reset Everything

```bash
# Complete reset (WARNING: Deletes all data!)
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

---

## Health Checks

### Check if application is running

```bash
# Check containers
docker-compose ps

# Should show:
# app - Up - 0.0.0.0:3000->3000/tcp
# db  - Up (healthy) - 5432/tcp
```

### Test API endpoints

```bash
# Test server is responding
curl http://localhost:3000

# Test API health (should return 401 if working)
curl http://localhost:3000/api/products
```

### Check database connection

```bash
docker-compose exec db pg_isready -U postgres
# Should return: postgres:5432 - accepting connections
```

---

## Getting Help

If you're still experiencing issues:

1. **Check logs first:**
   ```bash
   docker-compose logs -f
   ```

2. **Verify environment:**
   - Docker version: `docker --version`
   - Docker Compose version: `docker-compose --version`
   - Check .env file exists and is correct

3. **Search for similar issues:**
   - Check GitHub issues
   - Search error message online

4. **Create an issue:**
   - Include error messages
   - Include relevant logs
   - Describe steps to reproduce
   - Mention your OS and Docker version

---

## Prevention Tips

1. **Regular maintenance:**
   ```bash
   # Weekly cleanup
   docker system prune
   ```

2. **Monitor disk space:**
   ```bash
   docker system df
   ```

3. **Keep Docker updated:**
   - Update Docker Desktop regularly
   - Update base images: `docker-compose pull`

4. **Backup data:**
   ```bash
   # Backup database
   docker-compose exec db pg_dump -U postgres filltheshelf > backup.sql
   
   # Restore database
   cat backup.sql | docker-compose exec -T db psql -U postgres filltheshelf
   ```

5. **Use version control:**
   - Commit changes regularly
   - Don't commit .env files
   - Keep docker-compose.yml in version control
