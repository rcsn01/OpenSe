## Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend

# Install dependencies first (better layer caching)
COPY frontend/package.json frontend/package-lock.json* ./
# Alpine needs build tools for many native modules used during react-scripts build
# install python3, make and g++ so node-gyp and native builds succeed
RUN apk add --no-cache python3 make g++ libc6-compat git && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    npm install --legacy-peer-deps

# Copy the rest of the frontend and build
COPY frontend/ ./
RUN npm run build

## Stage 2: Python backend with static assets
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source
COPY backend/ /app/

# Create uploads directory
RUN mkdir -p /app/uploads

# Copy built frontend into Flask static folder
COPY --from=frontend-builder /frontend/build /app/static

EXPOSE 5000

# Use Gunicorn with gevent-websocket worker to support Flask-SocketIO
CMD ["gunicorn", "-k", "geventwebsocket.gunicorn.workers.GeventWebSocketWorker", "-w", "1", "--timeout", "120", "-b", "0.0.0.0:5000", "app:app"]
