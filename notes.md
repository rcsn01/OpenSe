# Fill-The-Shelf — Project Plan

## 1. Overview

This document captures planning pages for the Fill-The-Shelf inventory reporting system. It describes architecture, APIs, data models, frontend pages, deployment notes, security considerations, and next steps.

Goal: a simplified single-server deployment where a Flask backend serves a React PWA and provides a REST + realtime API (via Socket.IO). PostgreSQL is used for persistence, and uploaded images are stored on a volume.

## 2. High-level Architecture

- Frontend: React PWA (served from Flask static folder)
- Backend: Flask + Flask-SocketIO + Flask-JWT-Extended + SQLAlchemy
- DB: PostgreSQL
- Deployment: Single docker-compose + one Dockerfile (multi-stage) that builds frontend and backend into one image. No Nginx.

Realtime flows
- When a user submits a StockUpdate (scan + status + notes + optional image), the backend saves it and emits a Socket.IO event to all connected dashboard clients.

## 3. API Specification

All API paths are under `/api`.

Auth
- POST /api/auth/register
	- body: { username, password }
	- returns: { access_token }

- POST /api/auth/login
	- body: { username, password }
	- returns: { access_token }

Stock updates
- GET /api/updates
	- auth: Bearer JWT
	- returns: list of StockUpdate objects sorted by created_at desc

- POST /api/updates
	- auth: Bearer JWT
	- multipart/form-data: fields: product_id (or product_code), status, notes, optional file `image`
	- saves uploaded image under /uploads and stores URL as `/uploads/<filename>`
	- emits Socket.IO event `update_created` with the created record

Uploads
- GET /uploads/<filename> -> serves the file from uploads folder

Web app
- All other routes are served by the React app (catch-all route)

## 4. Data Models

- User
	- id (int), username, password_hash, created_at

- Product
	- id (int), code (string), name (string), created_at

- StockUpdate
	- id (int), product_id (fk), status (enum: OUT_OF_STOCK, NEAR_OUT, ORDERED, RESTOCKED), notes (text), image_url (nullable string), user_id (fk), created_at (timestamp)

## 5. Frontend Pages and UX (wireframe mockups)

Below are simple ASCII wireframe pages for the main PWA screens. These are planning mockups — use them as a quick visual guide for layout and controls.

LoginPage (compact)

_________________________
|                       |
|       Login Page      |
|-----------------------|
|  Username: [ ______ ] |
|  Password: [ ______ ] |
|                       |
|  [ Login ]  [ SignUp ] |
|_______________________|

ScanPage (scan or manual entry)

_________________________
|                       |
|       Scan Page       |
|-----------------------|
|  [ Camera view area ] |
|                       |
|  Product code: [____] |
|  Status: (o) Out of   |
|          ( ) Near     |
|          ( ) Ordered  |
|          ( ) Restocked|
|  Notes:               |
|  [ multiline textarea ]
|  [ Add Image ] [Send] |
|_______________________|

DashboardPage (live feed)

_________________________
|                       |
|       Dashboard       |
|-----------------------|
|  [Filter] [Search]    |
|                       |
|  • 10:43 — PROD-1234   |
|    Status: Out of Stock
|    By: alice — "Left on shelf"
|    [thumb]             |
|                       |
|  • 10:40 — PROD-2345   |
|    Status: Restocked
|    By: bob — "Refilled"
|    [thumb]             |
|                       |
|  (live updates appended at top)
|_______________________|

Notes on usage
- Wireframes are purposefully minimal. They show the key inputs and the primary data a user needs.
- Dashboard rows should include: timestamp, product id/name, status badge (color-coded), notes, optional thumbnail, and submitter username.
- Scan page camera area should be replaced with a scanner integration or a manual code input fallback for devices without camera access.


## 6. Deployment Notes

- Compose defines `app` (builds root Dockerfile) and `db` (postgres:16-alpine).
- Bind ports: host 80 -> container 5000.
- Uploads persisted with volume `uploads-data` mounted to `/app/uploads`.
- Database persisted with `db-data`.

## 7. Security Considerations

- JWT secret via environment variable `JWT_SECRET_KEY`.
- Database URL via `DATABASE_URL`.
- Limit upload types and size; sanitize filenames; use Pillow to inspect images.
- Serve uploads with safe send_from_directory and no directory listing.

## 8. Next Steps

1. Review the file contents created alongside this plan and adjust env var names/credentials for your environment.
2. Optionally add tests for API endpoints and Socket.IO events.
3. Add migrations (Flask-Migrate) and robust backup strategy for production.

---

End of planning pages. The repository now contains a complete simplified codebase (files added per the plan). This is a planning document — no build was executed.

