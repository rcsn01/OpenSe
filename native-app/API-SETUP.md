# Native App Configuration

## Backend API Setup

The native app needs to connect to your backend API. Update the API URL in `/config/api.ts`:

### For Local Development (Same Network)

If your backend is running on your computer and you want to test on a physical device or emulator:

1. **Find your computer's local IP address:**
   - macOS: `System Settings > Network > Wi-Fi > Details > TCP/IP`
   - Or run in terminal: `ipconfig getifaddr en0`

2. **Update `config/api.ts`:**
   ```typescript
   export const API_BASE_URL = __DEV__ 
     ? 'http://192.168.1.X:5000' // Replace X with your IP
     : 'https://your-production-url.com';
   ```

3. **Make sure your backend is running:**
   ```bash
   cd web-app
   npm run dev
   ```

### For iOS Simulator (Local Backend)

Use `localhost`:
```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000'
  : 'https://your-production-url.com';
```

### For Android Emulator (Local Backend)

Use the special Android emulator localhost alias:
```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:5000'
  : 'https://your-production-url.com';
```

### For Production

Deploy your backend and update the production URL:
```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000'
  : 'https://your-backend.herokuapp.com'; // Your deployed backend
```

## Testing the Login

1. **Start your backend server:**
   ```bash
   cd web-app
   npm run dev
   ```

2. **Create a test user** (if you don't have one):
   - Use the web app at `http://localhost:3000`
   - Or use the signup screen in the native app

3. **Test credentials:**
   - Email: (use your test account email)
   - Password: (use your test account password)

## Troubleshooting

### "Network request failed" error

- ✅ Check that your backend is running
- ✅ Verify the IP address in `config/api.ts` matches your computer's IP
- ✅ Make sure your phone/emulator is on the same WiFi network
- ✅ Check firewall settings (allow port 5000)

### "Cannot connect to development server"

Try these IP addresses in order:
1. Your computer's local IP (e.g., `192.168.1.5:5000`)
2. For iOS Simulator: `localhost:5000`
3. For Android Emulator: `10.0.2.2:5000`

### CORS errors

Make sure your backend has CORS enabled (it should be already):
```javascript
// In web-app/server/index.js
app.use(cors()); // ✅ This is already configured
```
