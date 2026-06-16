# Single-stage build using node:18-alpine
# Only ONE base image needed — avoids multiple Docker Hub pulls
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl

WORKDIR /app

# Create logs directory early
RUN mkdir -p /app/logs

# Copy package files first (layer cache optimization)
COPY package*.json ./

# Install ALL dependencies (dev + prod) for build
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose backend port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "server.js"]
