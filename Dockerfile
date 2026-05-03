# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade --no-cache && apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs appuser

# ──────────────────────────────────────────────
# Dependencies stage
# ──────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ──────────────────────────────────────────────
# Production stage
# ──────────────────────────────────────────────
FROM base AS production

# Copy only prod dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (excluding dev files via .dockerignore)
COPY . .

# Remove dev/sensitive files from the image
RUN rm -rf .git tests .env .env.example *.test.js

# Set proper ownership
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production

# Use dumb-init to handle PID 1 signals properly
# Use the Node server — this runs server.js and the secure /api/gemini proxy
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
