# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Manifests first so Docker can cache the npm install layer
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN npm ci

# Source
COPY . .

# Build Vite client → server/public, then compile server TypeScript → server/dist
RUN npm run build -w client && npm run build -w server

# Prune dev deps so the copied node_modules are lean
RUN npm prune --omit=dev

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Copy the pruned workspace node_modules from the builder.
# Docker COPY dereferences workspace symlinks (e.g. @afterglow/*) into real
# directories; we immediately remove them since the compiled server JS has no
# runtime imports from those packages (TypeScript types are erased at compile time).
COPY --from=builder /app/node_modules ./node_modules
RUN rm -rf node_modules/@afterglow

# Compiled server JS
COPY --from=builder /app/server/dist ./server/dist

# Built client (Vite output written to server/public by the builder)
COPY --from=builder /app/server/public ./server/public

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
# Default DB path — must match the persistent volume mount in Coolify (/data).
# Without a volume mounted here, data survives container restarts but is wiped
# on every redeploy. Mount a host/named volume at /data to persist leaderboards.
ENV DB_PATH=/data/afterglow.sqlite

# Ensure the data directory exists even before the volume is mounted
RUN mkdir -p /data

# Use 127.0.0.1 (not localhost) to avoid IPv6 resolution issues on Alpine.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:3000/health" || exit 1

CMD ["node", "server/dist/index.js"]
