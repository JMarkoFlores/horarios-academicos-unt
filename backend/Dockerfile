# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (like sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Copy TypeScript config
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Install @nestjs/cli and TypeScript globally for build
RUN npm install -g @nestjs/cli typescript

# Copy source code
COPY . ./

# Build the application
RUN npm run build

# Remove dev dependencies before copying to production
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install dependencies for Puppeteer/Chromium and dumb-init
RUN apk add --no-cache \
      dumb-init \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Copy pruned node_modules and built app from builder (no network needed)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
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
CMD ["node", "dist/src/main"]
