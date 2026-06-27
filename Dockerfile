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

# Drop dev deps so the copied node_modules are lean
RUN npm prune --omit=dev

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app

# Re-install only server production deps in a clean directory.
# This avoids copying workspace symlinks that point to non-existent paths.
COPY server/package.json ./package.json
RUN npm install --omit=dev

# Compiled server JS
COPY --from=builder /app/server/dist ./server/dist

# Built client (output from Vite, written to server/public by the builder)
COPY --from=builder /app/server/public ./server/public

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/health" || exit 1

CMD ["node", "server/dist/index.js"]
