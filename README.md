# AFTERGLOW

A browser-based 2D action-platformer built for speedrunning: time-based leaderboards, ghost-replay racing, and a synthwave/neon aesthetic. "Multiplayer" is lag-free because players race *recorded replays* of past runs — no live state sync ever.

---

## Local development

### Prerequisites
- Node.js 22+
- npm 10+
- Docker + Docker Compose (for container testing)

### First-time setup

```bash
npm install
cp .env.example .env
```

### Run (Vite dev server + Fastify)

```bash
npm run dev
```

- Client: http://localhost:5173 (Vite, hot-reload)
- Server: http://localhost:3000 (Fastify API; Vite proxies `/api` and `/health` to it)

### Build

```bash
npm run build
```

Compiles the Vite client into `server/public/` and TypeScript server into `server/dist/`.

### Type-check

```bash
npm run typecheck
```

---

## Docker (mirrors production)

```bash
docker compose up --build
```

- App at http://localhost:3000
- SQLite file persists in `./data/afterglow.sqlite` (mounted volume)

To test a fresh redeploy (data survives):

```bash
docker compose down && docker compose up --build
```

---

## GitHub → Coolify auto-deploy

Coolify watches this repo and redeploys on every push to `main`. Follow these steps once to wire it up.

### 1. Connect the repo in Coolify

1. Coolify dashboard → **New Resource → Application**
2. Select your GitHub connection → choose the `AfterGlow` repository
3. Branch: `main`
4. Build pack: **Dockerfile** (auto-detected from repo root)
5. Enable **Auto-deploy on push** — Coolify will register a GitHub webhook

### 2. Configure the service

| Setting | Value |
|---|---|
| Exposed port | `3000` (matches `PORT` env var) |
| Health check path | `/health` |

**Environment variables** (add in Coolify's env UI — never commit real values):

| Variable | Example | Notes |
|---|---|---|
| `PORT` | `3000` | Port Fastify listens on |
| `NODE_ENV` | `production` | |
| `DB_PATH` | `/data/afterglow.sqlite` | Must match the volume mount |
| `ADMIN_TOKEN` | `<random secret>` | Guards `POST /api/admin/reset` |
| `CORS_ORIGIN` | `https://game.example.com` | Comma-separated or `*` |

**Persistent volume** — critical:

Add a volume in Coolify: host path or named volume mounted at `/data` inside the container. Without this, leaderboard data is wiped on every redeploy.

### 3. Smoke-test checklist

After every deploy, run through these in order:

- [ ] `https://game.example.com/health` returns `{"status":"ok","timestamp":"..."}` (HTTP 200)
- [ ] Game loads — title screen shows **AFTERGLOW** and three level cards (GRID_01, GRID_02, GRID_03)
- [ ] Click a level card, cross the start line — timer begins
- [ ] Complete a run — finish screen + leaderboard overlay appears
- [ ] Submit a name — `POST /api/runs` returns a rank; entry appears in the leaderboard list
- [ ] `GET /api/leaderboard/grid-01` returns the run just submitted
- [ ] Trigger a redeploy (or `docker compose down && docker compose up --build` locally)
- [ ] Revisit the leaderboard — the previous run is still there (confirms `/data` volume is mounted)
- [ ] Ghost replay — start the same level again; a cyan ghost should appear racing your previous PB

---

## Cloudflare Tunnel

The Coolify server needs no open inbound ports. Cloudflare Tunnel routes your public hostname to the service's internal address.

### Option A — Coolify manages the domain

1. In the Coolify service settings, add your public hostname (e.g. `game.example.com`)
2. Coolify's built-in Traefik proxy handles the Cloudflare tunnel ingress
3. Ensure your Cloudflare Zero Trust tunnel points to the Coolify Traefik address/port

### Option B — Manual `cloudflared` config

If you manage the tunnel yourself, map the hostname to the service's internal address:

```yaml
# ~/.cloudflared/config.yml
tunnel: <your-tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: game.example.com
    service: http://<coolify-internal-host>:3000
  - service: http_status:404
```

```bash
cloudflared tunnel run
```

No inbound firewall ports need to be opened — all traffic flows outbound through the tunnel.

---

## Environment variables reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server listen port |
| `NODE_ENV` | `development` | `development` skips static file serving (Vite handles it) |
| `DB_PATH` | `/data/afterglow.sqlite` | SQLite file path (persistent volume in prod) |
| `ADMIN_TOKEN` | — | Secret for admin API endpoints |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |

---

## Architecture notes

- **Engine:** Phaser 3.90.0 + Arcade Physics (WebGL preferred, Canvas fallback)
- **Client:** Vite 8 bundles TypeScript → served by Fastify in production
- **Server:** Fastify 5, CommonJS output, binds `0.0.0.0:PORT`
- **DB:** SQLite via Drizzle ORM (added Phase 7) — swap to Postgres by changing the Drizzle driver
- **Ghost racing:** All "multiplayer" is local replay of downloaded blobs; no in-race networking ever
- **Fixed timestep:** Game logic, timer, and ghost recording all run at 60 Hz regardless of display framerate

### Postgres upgrade path (future)

Replace `better-sqlite3` with `pg` or `@electric-sql/pglite` in `server/package.json`, update the Drizzle client instantiation in `server/src/db/client.ts`, and update `DB_PATH` → `DATABASE_URL`. Drizzle schema and query code remain unchanged.

---

## Build order (phases)

| Phase | Description | Status |
|---|---|---|
| 1 | Scaffold — repo, Vite+Phaser client, Fastify server, Docker, deploy pipeline | ✅ |
| 2 | Movement core — player controller, fixed timestep, test level | ✅ |
| 3 | Level system — JSON loader, registry, first real level, timer | ✅ |
| 4 | Collectibles & combat — coins, destructibles, powerups, enemies | ✅ |
| 5 | Neon pass — glow pipeline, particles, parallax, palette polish | ✅ |
| 6 | Ghost recorder/player — record → encode/gzip → local replay | ✅ |
| 7 | Backend + leaderboards — Drizzle schema, API routes, validation | ✅ |
| 8 | Ghost racing UX — download + race ghosts, multi-ghost rendering | ✅ |
| 9 | Levels 2 & 3, balancing, par times | ✅ |
| 10 | Deploy hardening — README, persistence test, migrations-on-boot | ✅ |
