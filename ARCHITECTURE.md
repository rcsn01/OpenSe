# Application Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DOCKER HOST                              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Docker Compose                          │ │
│  │                                                            │ │
│  │  ┌──────────────────────────┐  ┌─────────────────────┐   │ │
│  │  │    App Container         │  │   DB Container      │   │ │
│  │  │    (Port 3000)           │  │   (Port 5432)       │   │ │
│  │  │                          │  │                     │   │ │
│  │  │  ┌─────────────────┐    │  │  ┌──────────────┐  │   │ │
│  │  │  │  React Frontend │    │  │  │  PostgreSQL  │  │   │ │
│  │  │  │  (Static Files) │    │  │  │   Database   │  │   │ │
│  │  │  └────────┬────────┘    │  │  └──────▲───────┘  │   │ │
│  │  │           │              │  │         │          │   │ │
│  │  │  ┌────────▼────────┐    │  │         │          │   │ │
│  │  │  │  Express API    │    │  │         │          │   │ │
│  │  │  │  (Backend)      │◄───┼──┼─────────┘          │   │ │
│  │  │  └─────────────────┘    │  │                     │   │ │
│  │  │           │              │  │                     │   │ │
│  │  │  ┌────────▼────────┐    │  │                     │   │ │
│  │  │  │  Uploads Volume │    │  │                     │   │ │
│  │  │  └─────────────────┘    │  │                     │   │ │
│  │  └──────────────────────────┘  └─────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                          ▲
                          │
                    HTTP (Port 3000)
                          │
                          ▼
                  ┌───────────────┐
                  │   User's      │
                  │   Browser     │
                  └───────────────┘
```

## Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Journey                              │
└─────────────────────────────────────────────────────────────────┘

1. Authentication Flow:
   ┌──────┐    POST /api/auth/signup    ┌────────┐    ┌──────────┐
   │ User │──────────────────────────────>│  API   │───>│   DB     │
   └──────┘                               └────────┘    └──────────┘
                                              │
                                   Return JWT Token
                                              │
                                              ▼
                                    Store in localStorage

2. QR Code Scanning Flow:
   ┌──────┐    Scan QR Code    ┌─────────────┐
   │ User │─────────────────────>│  Scanner    │
   └──────┘                      │  Component  │
                                 └──────┬──────┘
                                        │
                         GET /api/products/:qrCode
                                        │
                                        ▼
                                 ┌────────────┐
                                 │    API     │
                                 └──────┬─────┘
                                        │
                                        ▼
                                 ┌──────────┐
                                 │    DB    │
                                 └──────────┘

3. Report Submission Flow:
   ┌──────┐    Fill Form + Upload Image    ┌────────────┐
   │ User │────────────────────────────────>│  Scanner   │
   └──────┘                                 │ Component  │
                                            └──────┬─────┘
                                                   │
                              POST /api/reports (FormData)
                                                   │
                                                   ▼
                                            ┌────────────┐
                                            │    API     │
                                            │  + Multer  │
                                            └──────┬─────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │                             │
                                    ▼                             ▼
                            ┌──────────────┐              ┌──────────┐
                            │  Save Image  │              │    DB    │
                            │  to /uploads │              │  Insert  │
                            └──────────────┘              └──────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      Request/Response Cycle                       │
└──────────────────────────────────────────────────────────────────┘

Browser                 React App              Express API         Database
   │                       │                        │                  │
   │   1. Navigate         │                        │                  │
   │──────────────────────>│                        │                  │
   │                       │                        │                  │
   │   2. Load App         │                        │                  │
   │<──────────────────────│                        │                  │
   │                       │                        │                  │
   │   3. API Request      │   4. HTTP Request      │                  │
   │   (with JWT token)    │   (Authorization)      │                  │
   │──────────────────────>│───────────────────────>│                  │
   │                       │                        │                  │
   │                       │                        │   5. SQL Query   │
   │                       │                        │─────────────────>│
   │                       │                        │                  │
   │                       │                        │   6. Results     │
   │                       │                        │<─────────────────│
   │                       │                        │                  │
   │                       │   7. JSON Response     │                  │
   │   8. Display Data     │<───────────────────────│                  │
   │<──────────────────────│                        │                  │
   │                       │                        │                  │
```

## Database Schema Relations

```
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│    users     │           │stock_reports │           │   products   │
├──────────────┤           ├──────────────┤           ├──────────────┤
│ id (PK)      │◄──────────│ user_id (FK) │           │ id (PK)      │
│ username     │           │ product_id   │──────────>│ qr_code      │
│ email        │           │ status       │           │ name         │
│ password     │           │ notes        │           │ description  │
│ created_at   │           │ image_url    │           │ created_at   │
└──────────────┘           │ created_at   │           └──────────────┘
                           └──────────────┘
```

## Docker Container Communication

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network (Bridge)                   │
│                                                              │
│   ┌─────────────────────┐         ┌─────────────────────┐  │
│   │  app:3000           │  TCP    │  db:5432            │  │
│   │  ┌───────────────┐  │  5432   │  ┌───────────────┐  │  │
│   │  │  Application  │──┼─────────┼──>│  PostgreSQL   │  │  │
│   │  └───────────────┘  │         │  └───────────────┘  │  │
│   │                     │         │                     │  │
│   │  Volumes:           │         │  Volumes:           │  │
│   │  - ./uploads        │         │  - postgres_data    │  │
│   └─────────────────────┘         └─────────────────────┘  │
│            │                                                │
│            │ Exposed                                        │
│            │ Port 3000                                      │
└────────────┼────────────────────────────────────────────────┘
             │
             ▼
      Host Machine
      localhost:3000
```

## File Upload Process

```
1. User selects image in Scanner component
   │
   ▼
2. Form submission with FormData
   │
   ├─> qrCode (text)
   ├─> status (text)
   ├─> notes (text)
   └─> image (file)
   │
   ▼
3. Multer middleware processes upload
   │
   ├─> Validates file type (jpeg, jpg, png, gif)
   ├─> Validates file size (max 5MB)
   ├─> Generates unique filename
   └─> Saves to /app/uploads/
   │
   ▼
4. Database record created
   │
   ├─> product_id (lookup by qrCode)
   ├─> user_id (from JWT token)
   ├─> status
   ├─> notes
   └─> image_url (/uploads/filename.jpg)
   │
   ▼
5. Response sent to client
   │
   ▼
6. Client displays success message
```

## Environment Configuration Flow

```
Development:
  .env file ──> Node.js process.env ──> Application

Production (Docker):
  docker-compose.yml ──> Container environment ──> Application
```

## Authentication Flow Detail

```
┌──────────────────────────────────────────────────────────────┐
│                   JWT Authentication                          │
└──────────────────────────────────────────────────────────────┘

1. Login/Signup:
   Password ──> bcrypt.hash() ──> Hashed Password ──> Database
                                                          │
                                                          ▼
   User Data ──> jwt.sign() ──> JWT Token ──> Client localStorage

2. Authenticated Request:
   Client ──> Request Header: "Authorization: Bearer <token>"
      │
      ▼
   Auth Middleware ──> jwt.verify(token)
      │                     │
      │ Valid               │ Invalid
      ▼                     ▼
   Continue           401 Unauthorized
      │
      ▼
   Route Handler ──> Database Query ──> Response

3. Logout:
   Client ──> Remove token from localStorage
```
