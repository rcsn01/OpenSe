# Authentication Flow

## Overview

The native app now includes a complete authentication system that connects to your backend API.

## Features

✅ **Login Screen** - Sign in with email and password
✅ **Signup Screen** - Create new account
✅ **Protected Routes** - Tabs only accessible when logged in
✅ **Persistent Auth** - Stay logged in across app restarts
✅ **Logout** - Sign out from the Profile tab

## File Structure

```
native-app/
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── config/
│   └── api.ts                   # API endpoints configuration
├── app/
│   ├── login.tsx                # Login screen
│   ├── signup.tsx               # Signup screen
│   ├── _layout.tsx              # Root layout with auth routing
│   └── (tabs)/
│       ├── index.tsx            # QR Scanner (protected)
│       ├── dashboard.tsx        # Dashboard (protected)
│       ├── products.tsx         # Products (protected)
│       └── profile.tsx          # Profile with logout (protected)
```

## How It Works

### 1. Authentication Context

The `AuthContext` provides auth state and methods throughout the app:
- `user` - Current user object (or null)
- `token` - JWT token for API requests
- `login(email, password)` - Login function
- `signup(username, email, password)` - Signup function
- `logout()` - Logout function
- `isLoading` - Loading state during auth check

### 2. Protected Routes

The root `_layout.tsx` automatically redirects users:
- Not logged in → redirects to `/login`
- Logged in → redirects to `/(tabs)`

### 3. Token Storage

Auth tokens are stored using AsyncStorage:
- Persists across app restarts
- Automatically loads on app launch
- Cleared on logout

### 4. API Integration

All API calls use the token from context:
```typescript
const { token } = useAuth();

const response = await fetch(API_ENDPOINTS.products, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Setup Instructions

1. **Configure API URL** (see `API-SETUP.md`)
2. **Start backend server:**
   ```bash
   cd web-app
   npm run dev
   ```
3. **Start Expo:**
   ```bash
   cd native-app
   npx expo start
   ```

## Usage

### Login Flow
1. App opens to login screen
2. User enters email and password
3. On success, redirects to QR scanner tab
4. Token stored for future sessions

### Signup Flow
1. User taps "Sign up" link
2. Enters username, email, password
3. On success, automatically logged in
4. Redirects to QR scanner tab

### Logout Flow
1. User navigates to Profile tab
2. Taps "Logout" button
3. Confirms logout in alert
4. Token cleared, redirects to login

## Next Steps

- [ ] Add product scanning with authenticated API calls
- [ ] Add report submission using auth token
- [ ] Add dashboard with user's reports
- [ ] Add password reset functionality
- [ ] Add profile editing
