# ── PostPilot API — Multi-stage Dockerfile ──────────────
# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 postpilot && \
    adduser --system --uid 1001 postpilot

# Copy production deps only
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY .env.example ./.env.example

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