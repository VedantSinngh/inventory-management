# Single-stage build — uses ONLY node:18-alpine (no nginx pull needed)
# Serves the built React app via 'serve' package (lightweight Node HTTP server)
FROM node:18-alpine

# Install serve globally to host the built app
RUN npm install -g serve

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source
COPY . .

# Build the Vite React app
RUN npm run build

# Expose on port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Serve the built dist folder on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
