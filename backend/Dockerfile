# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (from repository root)
COPY backend/package*.json ./

# Copy TypeScript config explicitly (from backend directory)
COPY backend/tsconfig.json ./
COPY backend/tsconfig.build.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Install TypeScript globally for build
RUN npm install -g typescript

# Copy source code (from backend directory)
COPY backend/ ./

# Build the application using tsc with production config
RUN tsc -p tsconfig.build.json

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
