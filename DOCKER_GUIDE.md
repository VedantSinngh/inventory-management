# Docker Deployment Guide

## Quick Start with Docker

Run the entire application stack locally with a single command:

```bash
docker-compose up -d
```

Access the application:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB: localhost:27017

---

## Docker Compose Services

### MongoDB

```yaml
mongodb:
  image: mongo:6.0
  ports:
    - "27017:27017"
```

- Stores all application data
- Available at `mongodb:27017` (internal) or `localhost:27017` (external)
- Credentials: `mongodb:mongodb_password_dev`
- Database: `inventorySystem`

**Connect with MongoDB Compass:**
```
mongodb://mongodb:mongodb_password_dev@localhost:27017/inventorySystem
```

### Backend

```yaml
backend:
  build: ./backend
  ports:
    - "5000:5000"
```

- Node.js Express API server
- Available at `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`
- Auto-restarts on code changes (volume mounted)

### Frontend

```yaml
frontend:
  build: ./frontend
  ports:
    - "3000:3000"
```

- React SPA with Vite
- Served by Nginx
- Available at `http://localhost:3000`
- API proxy configured via nginx.conf

### Redis (Optional)

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  profiles:
    - optional
```

Start with Redis:
```bash
docker-compose --profile optional up -d
```

---

## Commands

### Start Services

```bash
# Start all services in background
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up -d backend
docker-compose up -d frontend
docker-compose up -d mongodb
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop without removing volumes
docker-compose stop

# Remove everything (volumes too)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Last N lines
docker-compose logs --tail 100 backend
```

### Execute Commands

```bash
# Run command in backend
docker-compose exec backend npm run seed

# Access MongoDB shell
docker-compose exec mongodb mongosh -u mongodb -p

# Access frontend shell
docker-compose exec frontend sh
```

### Rebuild Images

```bash
# Rebuild backend image
docker-compose build backend

# Rebuild all images
docker-compose build

# Rebuild without cache
docker-compose build --no-cache
```

---

## Development Workflow

### 1. Start Environment

```bash
docker-compose up -d
```

### 2. Seed Database

```bash
docker-compose exec backend npm run seed
```

### 3. Test Application

```bash
# Frontend: http://localhost:3000
# Backend: http://localhost:5000/api/health
# Login: admin@system.core / admin123
```

### 4. View Logs

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. Make Changes

- Backend: Edit files in `backend/` → Auto-reload via volume mount
- Frontend: Edit files in `frontend/` → Hot reload via Vite
- Changes reflect immediately

### 6. Rebuild (if needed)

```bash
docker-compose build backend
docker-compose up -d backend
```

---

## Production Deployment

### Building for Production

```bash
# Build images
docker build -t inventory-backend:latest ./backend
docker build -t inventory-frontend:latest ./frontend

# Tag for registry
docker tag inventory-backend:latest ghcr.io/username/inventory-backend:latest
docker tag inventory-frontend:latest ghcr.io/username/inventory-frontend:latest

# Push to registry
docker push ghcr.io/username/inventory-backend:latest
docker push ghcr.io/username/inventory-frontend:latest
```

### Deploy on Railway

Railway auto-builds Docker images from Dockerfile.

1. **Connect Repository to Railway**
   - Go to railway.app
   - Create project from GitHub
   - Select your repository

2. **Configure Environment Variables**
   - Railway auto-detects `Dockerfile`
   - Set environment variables in Railway dashboard
   - Required: `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`

3. **Railway Auto-Deployment**
   - Push to `full` branch
   - Railway builds Dockerfile automatically
   - Deploys when build succeeds

### Deploy on AWS ECS

```bash
# 1. Create ECS cluster
aws ecs create-cluster --cluster-name inventory-production

# 2. Create task definition from docker-compose
# (Requires ECS CLI installed)
ecs-cli compose service up

# 3. View service
aws ecs list-services --cluster inventory-production
```

### Deploy on Kubernetes

Create a Helm chart or use kubectl:

```bash
# Build and push images
docker build -t inventory-backend:1.0.0 ./backend
docker push your-registry/inventory-backend:1.0.0

# Deploy with kubectl
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

---

## Troubleshooting

### Container won't start

```bash
# View logs
docker-compose logs backend

# Common issues:
# - Port already in use: Change port mapping in docker-compose.yml
# - MongoDB not ready: Wait 30 seconds before connecting
# - Environment variables missing: Check .env file
```

### MongoDB connection failed

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Verify connection
docker-compose exec mongodb mongosh -u mongodb -p

# Check logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Frontend can't reach backend

```bash
# Verify backend is running
docker-compose ps backend

# Check API endpoint
curl http://backend:5000/api/health

# Verify proxy config (nginx.conf)
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### Out of memory

```bash
# Increase Docker memory
# Mac/Windows: Docker Desktop → Preferences → Resources → Memory
# Linux: No limit by default

# Check current usage
docker stats
```

### Permission denied

```bash
# Add current user to docker group (Linux only)
sudo usermod -aG docker $USER
newgrp docker

# Or use sudo
sudo docker-compose up
```

---

## Performance Optimization

### 1. Multi-Stage Builds

Already implemented in Dockerfiles:
- Reduces final image size
- Removes build dependencies
- Faster startup

### 2. Layer Caching

```bash
# Order matters in Dockerfile for caching:
# 1. FROM (base image)
# 2. COPY package*.json (changes rarely)
# 3. RUN npm ci (cached if package.json unchanged)
# 4. COPY . (changes frequently)
```

### 3. Image Size

```bash
# Check image sizes
docker images inventory-*

# Optimize by:
# - Using alpine base images (✅ already done)
# - Removing build dependencies (✅ multi-stage)
# - Using .dockerignore
```

### 4. Networking

Docker Compose automatically handles:
- Service discovery (backend:5000)
- DNS resolution
- Network isolation

---

## .dockerignore Files

### Backend (.dockerignore)

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
logs/
coverage/
.vscode/
dist/
```

### Frontend (.dockerignore)

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
dist/
.vscode/
coverage/
```

---

## Health Checks

All services include health checks that automatically restart failed containers:

```bash
# View health status
docker-compose ps

# Manually trigger health check
docker-compose exec backend curl http://localhost:5000/api/health
```

---

## Security Best Practices

✅ **Implemented:**
- Non-root user in containers (nodejs user)
- Alpine base images (smaller attack surface)
- Security headers in nginx.conf
- Health checks for monitoring
- Environment variables for secrets

**Additional Recommendations:**
- Use Docker secrets (production)
- Scan images with Trivy
- Keep base images updated
- Use private registries
- Implement resource limits

---

## Monitoring

### View Container Stats

```bash
docker stats

# Specific container
docker stats inventory-backend
```

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail 100

# Specific service
docker-compose logs -f backend
```

### Check Services Health

```bash
docker-compose ps

# Output shows:
# NAME          STATUS
# backend       Up (healthy)
# frontend      Up (healthy)
# mongodb       Up (healthy)
```

---

## Cleanup

### Remove Stopped Containers

```bash
docker container prune
```

### Remove Unused Images

```bash
docker image prune
```

### Remove Everything

```bash
# Remove containers, images, volumes
docker system prune -a --volumes
```

---

## Advanced: Custom Networks

Services automatically communicate via the `inventory-network`:

```bash
# Check network
docker network ls
docker network inspect inventory-network

# Add external service to network
docker run -d --network inventory-network --name external-service ...
```

---

## Reference

**Docker Compose Documentation:** https://docs.docker.com/compose/  
**Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/  
**Docker Security:** https://docs.docker.com/engine/security/

---

Last Updated: April 29, 2026
