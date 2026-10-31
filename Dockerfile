# =============================================================================
# Multi-stage Production Dockerfile for FitLens (Optimized for Vultr Deployment)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend and Backend
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for vite & esbuild)
RUN npm ci

# Copy application source and build configurations
COPY tsconfig.json vite.config.ts index.html server.ts ./
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY eval/ ./eval/

# Build client (vite -> dist/) and bundled server (esbuild -> dist-server/server.js)
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Runtime
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    APP_ROOT=/app

# Install wget for healthcheck if needed (alpine includes busybox wget)
RUN apk --no-cache add wget ca-certificates

# Copy package manifests and install ONLY production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy pre-built application artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/public ./public
COPY --from=builder /app/eval ./eval

# Ensure data directory exists with empty database (zero static data) and proper permissions
RUN mkdir -p /app/data && \
    echo "[]" > /app/data/prospects_db.json && \
    chown -R node:node /app

# Expose HTTP port
EXPOSE 3000

# Declare persistent volume mount for the prospects CRM database
VOLUME ["/app/data"]

# Run as non-privileged node user for security
USER node

# Health check to ensure zero-downtime restarts and load balancer health verification
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Start the optimized bundled production server
CMD ["node", "dist-server/server.js"]
