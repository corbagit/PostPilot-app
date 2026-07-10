# ── PostPilot — Multi-stage Dockerfile ──────────────────
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY web/package.json web/package-lock.json* ./web/
RUN cd web && npm ci
COPY web/ ./web/
RUN cd web && npm run build

# Stage 2: Install backend deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY api/package.json api/package-lock.json* ./api/
RUN cd api && npm ci --omit=dev

# Stage 3: Runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 postpilot && \
    adduser --system --uid 1001 postpilot

# Copy backend production deps
COPY --from=deps /app/api/node_modules ./node_modules
COPY api/package.json ./
COPY api/src/ ./src/
COPY api/.env.example ./.env.example

# Copy built frontend assets into the public directory
COPY --from=frontend-builder /app/web/dist/ ./src/public/

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R postpilot:postpilot /app

USER postpilot

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/postpilot.db

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]