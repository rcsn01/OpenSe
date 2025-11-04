#!/bin/bash

# Inventory Tracker - Docker Swarm Deployment Script
# This script automates the deployment of the Inventory Status Reporting System
# Load secrets from .env (do not commit .env to git). See .env.example.
if [ -f .env ]; then
    echo "Loading environment variables from .env"
    # shellcheck disable=SC1091
    set -o allexport
    source .env
    set +o allexport
fi

# Ensure required secrets are set (fail fast with a clear message)
if [ -z "${DB_USER:-}" ] || [ -z "${DB_PASSWORD:-}" ] || [ -z "${JWT_SECRET:-}" ]; then
    echo "\nERROR: Missing required secrets. Create a .env file (copy .env.example) and set DB_USER, DB_PASSWORD, and JWT_SECRET."
    exit 1
fi

set -e

echo "=================================="
echo "Inventory Tracker Deployment"
echo "=================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✓ Docker is running"

# Check if Swarm is initialized
if ! docker info | grep -q "Swarm: active"; then
    echo ""
    read -p "Docker Swarm is not initialized. Initialize now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Initializing Docker Swarm..."
        docker swarm init
        echo "✓ Docker Swarm initialized"
    else
        echo "❌ Cannot deploy without Docker Swarm. Exiting."
        exit 1
    fi
else
    echo "✓ Docker Swarm is active"
fi

# Check if secrets exist
echo ""
echo "Checking Docker secrets..."


# Always create/update secrets with hardcoded values
echo "Creating Docker secrets with hardcoded values (will not replace existing secrets)..."
if docker secret inspect db_user > /dev/null 2>&1; then
    echo "✓ Secret 'db_user' already exists; leaving it in place"
else
    echo -n "$DB_USER" | docker secret create db_user -
    echo "✓ Created secret 'db_user'"
fi
if docker secret inspect db_password > /dev/null 2>&1; then
    echo "✓ Secret 'db_password' already exists; leaving it in place"
else
    echo -n "$DB_PASSWORD" | docker secret create db_password -
    echo "✓ Created secret 'db_password'"
fi
if docker secret inspect jwt_secret_key > /dev/null 2>&1; then
    echo "✓ Secret 'jwt_secret_key' already exists; leaving it in place"
else
    echo -n "$JWT_SECRET" | docker secret create jwt_secret_key -
    echo "✓ Created secret 'jwt_secret_key'"
fi

echo ""
echo "All secrets are configured"

# Export plaintext values into variables for later one-shot init (may be empty
# if user skipped pasting existing secrets). We normalize names used below.
DB_USER_PLAINTEXT="$DB_USER"
DB_PASSWORD_PLAINTEXT="$DB_PASSWORD"
JWT_SECRET_PLAINTEXT="$JWT_SECRET"

# Build Docker images
echo ""
echo "Building Docker images..."
echo "This may take a few minutes on first run..."

echo ""
echo "Building backend image..."
docker build -t inventory-backend:latest ./backend
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi
echo "✓ Backend image built"

echo ""
echo "Building proxy image..."
docker build -f proxy/Dockerfile -t inventory-proxy:latest .
if [ $? -ne 0 ]; then
    echo "❌ Proxy build failed"
    exit 1
fi
echo "✓ Proxy image built"

# Deploy the stack
echo ""
echo "Deploying stack 'inventory'..."
docker stack deploy -c docker-compose.yml inventory

echo ""
echo "=================================="
echo "Deployment initiated!"
echo "=================================="
echo ""
echo "Checking service status..."
sleep 3

docker service ls

# Determine the overlay network created by the stack so we can attach one-shot containers to it
NET_NAME=$(docker network ls --filter driver=overlay --format '{{.Name}}' | grep '^inventory_' | head -n1 || true)
if [ -z "$NET_NAME" ]; then
    NET_NAME=$(docker network ls --filter label=com.docker.stack.namespace=inventory --format '{{.Name}}' | head -n1 || true)
fi

echo "\nWaiting for database service to accept connections..."
DB_READY=false
if [ -n "$NET_NAME" ]; then
    echo "Using network: $NET_NAME to probe the database"
    ATTEMPTS=0
    until docker run --rm --network "$NET_NAME" -e PGPASSWORD="${DB_PASSWORD_PLAINTEXT}" postgres:16-alpine \
        psql -h db -U "${DB_USER_PLAINTEXT}" -d inventory_db -c '\q' 2>/dev/null; do
        ATTEMPTS=$((ATTEMPTS+1))
        if [ $ATTEMPTS -ge 120 ]; then
            echo "⚠️ Database did not accept connections within timeout. Check 'docker service logs inventory_db'."
            break
        fi
        echo "Waiting for postgres to accept connections... (attempt $ATTEMPTS)"
        sleep 2
    done
    if [ $ATTEMPTS -lt 120 ]; then
        DB_READY=true
    fi
else
    # Fallback: look for the ready message in the container logs
    for i in {1..60}; do
        if docker service logs inventory_db --tail 50 2>/dev/null | grep -q "database system is ready to accept connections"; then
            DB_READY=true
            break
        fi
        sleep 1
    done
fi

if [ "$DB_READY" != true ]; then
    echo "⚠️ Database did not become ready within timeout. Check 'docker service logs inventory_db'."
else
    echo "✓ Database service reports ready"

    # If we have plaintext DB credentials available, run one-shot init.
    if [ -n "${DB_USER_PLAINTEXT}" ] && [ -n "${DB_PASSWORD_PLAINTEXT}" ]; then
        echo "Running one-shot DB initialization using built backend image..."

        # Detect the overlay network created by the stack so the init container can join it.
        NET_NAME=$(docker network ls --filter driver=overlay --format '{{.Name}}' | grep '^inventory_' | head -n1 || true)
        if [ -z "$NET_NAME" ]; then
            # try label-based lookup
            NET_NAME=$(docker network ls --filter label=com.docker.stack.namespace=inventory --format '{{.Name}}' | head -n1 || true)
        fi

        if [ -z "$NET_NAME" ]; then
            echo "⚠ Could not determine the stack overlay network name. You may need to run the init manually."
        else
            echo "Using network: $NET_NAME for DB init"

            # Try psql connectivity first using the official postgres client
            ATTEMPTS=0
            until docker run --rm --network "$NET_NAME" -e PGPASSWORD="${DB_PASSWORD_PLAINTEXT}" postgres:16-alpine \
                psql -h db -U "${DB_USER_PLAINTEXT}" -d inventory_db -c '\q' 2>/dev/null; do
                ATTEMPTS=$((ATTEMPTS+1))
                if [ $ATTEMPTS -ge 30 ]; then
                    echo "Failed to connect to postgres with provided credentials. Skipping init step."
                    break
                fi
                echo "Waiting for postgres to accept connections... (attempt $ATTEMPTS)"
                sleep 2
            done

            if [ $ATTEMPTS -lt 30 ]; then
                # Run the init script inside the backend image (it will use env vars or secrets)
                docker run --rm --network "$NET_NAME" \
                    -e DB_HOST=db -e DB_USER="${DB_USER_PLAINTEXT}" -e DB_PASSWORD="${DB_PASSWORD_PLAINTEXT}" -e DB_NAME=inventory_db \
                    inventory-backend:latest python init_db.py

                echo "✓ DB initialization finished (attempted). Scaling backend and proxy services to 3 and 1 replicas."
                docker service scale inventory_backend=3 || true
                docker service scale inventory_proxy=1 || true
            fi
        fi
    else
        echo "Note: No plaintext DB credentials provided, skipping automatic DB init."
        echo "You can initialize the database manually by running the 'init_db.py' script inside the backend image with access to the swarm overlay network."
        echo "Scaling backend and proxy services to 3 and 1 replicas."
        docker service scale inventory_backend=3 || true
        docker service scale inventory_proxy=1 || true
    fi
fi

echo ""
echo "=================================="
echo "Useful Commands:"
echo "=================================="
echo ""
echo "View all services:"
echo "  docker service ls"
echo ""
echo "View service logs:"
echo "  docker service logs inventory_backend -f"
echo "  docker service logs inventory_proxy -f"
echo "  docker service logs inventory_db -f"
echo ""
echo "Scale backend:"
echo "  docker service scale inventory_backend=5"
echo ""
echo "Remove stack:"
echo "  docker stack rm inventory"
echo ""
echo "=================================="
echo ""
echo "Your application should be available at:"
echo "  http://localhost"
echo ""
echo "Note: It may take a minute for all services to start."
echo "Run 'docker service ls' to check the status."
echo ""
