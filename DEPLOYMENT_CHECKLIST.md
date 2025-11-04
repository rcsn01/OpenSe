# Deployment Verification Checklist

Use this checklist to verify that your Inventory Status Reporting System is deployed correctly and functioning as expected.

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] Docker is installed and running
  ```bash
  docker --version
  docker info
  ```

- [ ] Docker Swarm is initialized
  ```bash
  docker info | grep Swarm
  # Should show "Swarm: active"
  ```

- [ ] All required files are present
  ```bash
  ls -la
  # Should see: docker-compose.yml, deploy.sh, backend/, frontend/, proxy/
  ```

### Docker Secrets

- [ ] `db_user` secret created
  ```bash
  docker secret ls | grep db_user
  ```

- [ ] `db_password` secret created
  ```bash
  docker secret ls | grep db_password
  ```

- [ ] `jwt_secret_key` secret created
  ```bash
  docker secret ls | grep jwt_secret_key
  ```

**Create missing secrets:**
```bash
echo "inventory_user" | docker secret create db_user -
openssl rand -base64 32 | docker secret create db_password -
openssl rand -base64 48 | docker secret create jwt_secret_key -
```

## 🚀 Deployment Checklist

### Stack Deployment

- [ ] Deploy the stack
  ```bash
  ./deploy.sh
  # OR
  docker stack deploy -c docker-compose.yml inventory
  ```

- [ ] Verify stack is deployed
  ```bash
  docker stack ls
  # Should show "inventory" stack
  ```

### Service Verification

- [ ] All services are listed
  ```bash
  docker service ls
  ```
  
  **Expected output:**
  ```
  NAME                  MODE        REPLICAS  IMAGE
  inventory_backend     replicated  3/3       ...
  inventory_db          replicated  1/1       ...
  inventory_proxy       replicated  1/1       ...
  ```

- [ ] Backend service has 3 replicas running
  ```bash
  docker service ps inventory_backend
  # Should show 3 tasks in "Running" state
  ```

- [ ] Proxy service is running
  ```bash
  docker service ps inventory_proxy
  # Should show 1 task in "Running" state
  ```

- [ ] Database service is running
  ```bash
  docker service ps inventory_db
  # Should show 1 task in "Running" state
  ```

### Network & Volume Verification

- [ ] Overlay network created
  ```bash
  docker network ls | grep inventory-net
  ```

- [ ] Volumes created
  ```bash
  docker volume ls | grep inventory
  # Should show: inventory_db-data, inventory_uploads-data
  ```

### Log Verification

- [ ] Backend logs show no errors
  ```bash
  docker service logs inventory_backend --tail 50
  # Look for "Database tables created successfully"
  # Should not see critical errors
  ```

- [ ] Database logs show successful initialization
  ```bash
  docker service logs inventory_db --tail 50
  # Look for "database system is ready to accept connections"
  ```

- [ ] Proxy logs show successful startup
  ```bash
  docker service logs inventory_proxy --tail 50
  # Should not see nginx errors
  ```

## 🧪 Functional Testing Checklist

### Application Access

- [ ] Application is accessible
  ```bash
  curl -I http://localhost
  # Should return HTTP 200 OK
  ```

- [ ] Health endpoint responds
  ```bash
  curl http://localhost/health
  # Should return "healthy"
  ```

### Frontend Testing

- [ ] Open application in browser
  - Visit: `http://localhost`
  - [ ] Page loads successfully
  - [ ] No console errors in browser DevTools
  - [ ] Login/Signup form is visible

### User Registration

- [ ] Create a new user account
  - Click "Sign Up"
  - [ ] Enter username (e.g., "testuser")
  - [ ] Enter password (min 6 characters)
  - [ ] Click "Sign Up"
  - [ ] Successfully logged in
  - [ ] Redirected to Dashboard
  - [ ] Navigation bar appears

### Authentication

- [ ] Token is stored
  - Open DevTools → Application → Local Storage
  - [ ] `token` key exists
  - [ ] `user` key exists with user data

- [ ] Logout works
  - [ ] Click "Logout" button
  - [ ] Redirected to login page
  - [ ] Token removed from localStorage

- [ ] Login works
  - [ ] Enter credentials
  - [ ] Click "Login"
  - [ ] Successfully logged in
  - [ ] Redirected to Dashboard

### QR Code Scanning

- [ ] Navigate to Scan page
  - [ ] Click "Scan Product" in navigation
  - [ ] Camera permission requested
  - [ ] QR scanner appears

- [ ] Scan a QR code
  - Generate test QR: https://www.qr-code-generator.com/
  - Use text: "TEST-PRODUCT-001"
  - [ ] QR code successfully scanned
  - [ ] Scanner stops
  - [ ] Form appears with scanned ID

### Status Update Submission

- [ ] Fill out the form
  - [ ] Select status (e.g., "Out of Stock")
  - [ ] Enter notes (e.g., "Test update")
  - [ ] Optional: Upload an image
  - [ ] Click "Submit Update"

- [ ] Submission successful
  - [ ] Success message appears
  - [ ] Redirected to Dashboard
  - [ ] New update appears at top

### Dashboard Real-time Updates

- [ ] Open Dashboard in TWO browser tabs
  - Tab 1: Dashboard
  - Tab 2: Scan page

- [ ] Submit update from Tab 2
  - [ ] Scan QR code
  - [ ] Submit status update

- [ ] Verify real-time update in Tab 1
  - [ ] New update appears automatically (without refresh)
  - [ ] Update shows at the top of the list
  - [ ] All data is correct (status, notes, user, time)

### Dashboard Filtering

- [ ] Test filter buttons
  - [ ] Click "Out of Stock" filter
  - [ ] Only out-of-stock items shown
  - [ ] Click "Ordered" filter
  - [ ] Only ordered items shown
  - [ ] Click "All" filter
  - [ ] All items shown again

### Image Upload & Display

- [ ] Submit update with image
  - [ ] Select an image file
  - [ ] Preview appears
  - [ ] Submit update
  - [ ] Success message

- [ ] Verify image on Dashboard
  - [ ] Update shows on Dashboard
  - [ ] Image is displayed correctly
  - [ ] Image URL is valid (starts with /uploads/)
  - [ ] Clicking image works

### API Testing (Optional)

- [ ] Test API endpoints
  ```bash
  # Get auth token first
  TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"password123"}' | \
    jq -r '.access_token')
  
  # Test get updates
  curl -H "Authorization: Bearer $TOKEN" http://localhost/api/updates
  # Should return JSON array of updates
  ```

### WebSocket Testing

- [ ] Open browser DevTools → Network → WS
  - [ ] WebSocket connection established
  - [ ] Connection to `/socket.io/` visible
  - [ ] Status: "101 Switching Protocols"

- [ ] Submit update and check WS
  - [ ] `new_update` event received
  - [ ] Event data contains update object

## 📊 Performance Testing

### Load Testing

- [ ] Multiple concurrent users
  - Open 5+ browser tabs
  - [ ] All tabs load successfully
  - [ ] Real-time updates work in all tabs

- [ ] Multiple updates quickly
  - Submit 10 updates in quick succession
  - [ ] All updates appear
  - [ ] No errors in backend logs

### Scaling Testing

- [ ] Scale backend up
  ```bash
  docker service scale inventory_backend=5
  docker service ls
  # Should show 5/5 replicas
  ```
  
  - [ ] Application still works
  - [ ] No errors
  - [ ] Real-time still works

- [ ] Scale backend down
  ```bash
  docker service scale inventory_backend=2
  ```
  
  - [ ] Application still works
  - [ ] Updates still arrive in real-time

## 🔐 Security Testing

### Authentication

- [ ] Unauthenticated requests blocked
  ```bash
  curl http://localhost/api/updates
  # Should return 401 Unauthorized
  ```

- [ ] Invalid token rejected
  ```bash
  curl -H "Authorization: Bearer invalid_token" \
    http://localhost/api/updates
  # Should return 401 Unauthorized
  ```

### Password Security

- [ ] Passwords are hashed
  - Check database (not recommended in production)
  - [ ] password_hash field contains hash, not plain text

### File Upload Security

- [ ] Only image files accepted
  - Try uploading .txt, .exe, etc.
  - [ ] Non-image files rejected

- [ ] File size limit enforced
  - Try uploading large file (>16MB)
  - [ ] Upload rejected

## 🐛 Error Handling Testing

### Backend Errors

- [ ] Invalid login credentials
  - [ ] Error message displayed
  - [ ] User stays on login page

- [ ] Duplicate username registration
  - [ ] Error message displayed
  - [ ] Registration fails gracefully

### Frontend Errors

- [ ] Network disconnection
  - Disable network in DevTools
  - [ ] Appropriate error shown
  - Re-enable network
  - [ ] Application recovers

- [ ] Invalid form submission
  - Submit empty form
  - [ ] Validation errors shown

## 📈 Monitoring Checklist

### Resource Usage

- [ ] Check CPU usage
  ```bash
  docker stats
  # CPU should be reasonable (<50% under normal load)
  ```

- [ ] Check memory usage
  ```bash
  docker stats
  # Memory should be stable (not continuously growing)
  ```

- [ ] Check disk usage
  ```bash
  docker system df
  # Check volumes size
  ```

### Service Health

- [ ] All services healthy
  ```bash
  docker service ls
  # All replicas should be running (e.g., 3/3)
  ```

- [ ] No restarting containers
  ```bash
  docker service ps inventory_backend
  # Current state should be "Running", not "Starting"
  ```

## 📱 Mobile/PWA Testing

### Mobile Browser

- [ ] Open on mobile device (same network)
  - Use your computer's IP: `http://192.168.x.x`
  - [ ] Site loads on mobile
  - [ ] Camera works for QR scanning
  - [ ] Forms are usable
  - [ ] Real-time updates work

### PWA Installation

- [ ] Install as PWA
  - Chrome: "Add to Home Screen"
  - [ ] Installation prompt appears
  - [ ] App installs to home screen
  - [ ] Opens in standalone mode
  - [ ] Works offline (cached pages)

## ✅ Production Readiness

### Configuration

- [ ] Secrets are strong and unique
  - [ ] Not using default values
  - [ ] Random, long strings

- [ ] Environment variables set correctly
  - [ ] DB credentials correct
  - [ ] JWT secret is secure

### Backup Strategy

- [ ] Database backup plan
  ```bash
  # Example backup
  docker exec $(docker ps -qf name=inventory_db) \
    pg_dump -U inventory_user inventory_db > backup.sql
  ```

- [ ] Volume backup plan
  ```bash
  # Backup uploads
  docker run --rm -v inventory_uploads-data:/data \
    -v $(pwd):/backup alpine tar czf /backup/uploads.tar.gz /data
  ```

### Documentation

- [ ] README.md reviewed
- [ ] QUICKSTART.md reviewed
- [ ] Team trained on deployment
- [ ] Rollback plan documented

## 🎉 Final Verification

- [ ] All services running: `docker service ls`
- [ ] No errors in logs: `docker service logs inventory_backend`
- [ ] Application accessible: Visit `http://localhost`
- [ ] Can register users
- [ ] Can scan QR codes
- [ ] Can submit updates
- [ ] Real-time updates work
- [ ] Images upload successfully
- [ ] Dashboard filters work
- [ ] Mobile access works

## 📞 Troubleshooting Quick Reference

**Services not starting:**
```bash
docker service ps inventory_backend --no-trunc
docker service logs inventory_backend
```

**Database issues:**
```bash
docker service logs inventory_db
docker exec -it $(docker ps -qf name=inventory_db) psql -U inventory_user -d inventory_db
```

**Network issues:**
```bash
docker network inspect inventory-net
```

**Clear and redeploy:**
```bash
docker stack rm inventory
docker system prune -f
./deploy.sh
```

---

## ✨ Success Criteria

Your deployment is successful when:
- ✅ All services show 100% replicas (e.g., 3/3)
- ✅ No errors in service logs
- ✅ Application accessible at http://localhost
- ✅ Users can register and login
- ✅ QR scanning works
- ✅ Status updates are created successfully
- ✅ Real-time updates appear instantly
- ✅ Images upload and display correctly
- ✅ Dashboard filters work
- ✅ Mobile access works

**If all items are checked, your deployment is complete! 🎉**
