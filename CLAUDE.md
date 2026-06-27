# CLAUDE.md — AFTERGLOW

Standing context for this project. Keep this file lean and up to date; if a command or rule changes, edit it here.

## What this is
A browser-based 2D action-platformer (Dead Cells–inspired) built for **speedrunning**: time-based leaderboards and lag-free "multiplayer" via recorded **ghost replays**. Synthwave/neon aesthetic. Deploys to a self-hosted **Coolify** server (which watches this GitHub repo and auto-redeploys on push) behind a **Cloudflare Tunnel**. The name **AFTERGLOW** is a design cue — glowing neon and the "afterimage" of motion; the ghosts you race are afterglows of past runs, so trails, light-streaks, and fading silhouettes are a recurring motif.

## Golden rules (do not violate)
1. **Ghosts, never live sync.** "Multiplayer" = downloading and replaying recorded runs. There is no real-time state synchronization between players, ever. This is what keeps it lag-free and identical across browsers. If you're tempted to add websockets for gameplay state, stop.
2. **Fixed timestep drives everything.** Game logic, the timer, and ghost recording all run on a fixed-timestep accumulator (e.g. 60Hz), rendered with interpolation. Never tie logic or timing to render frame delta.
3. **`main` is always deployable.** Every push to `main` triggers a live Coolify redeploy. Never push a `main` that doesn't build and run.
4. **No secrets in the repo.** Use `.env.example` with placeholders; real values live in the Coolify UI. Keep `.gitignore` honest (node_modules, dist, local `.env`, local SQLite file).
5. **Readability beats prettiness.** The neon look must never hurt gameplay clarity. Dim, desaturated background; bright, saturated foreground. Hot red-orange is reserved exclusively for things that damage the player.
6. **Leaderboards must stay fair.** Levels are fixed and versioned; changing a level's geometry bumps its version (scopes the board). The primary board ranks only clean runs.

## Tech stack
- **Engine:** Phaser (latest stable) + Arcade Physics. Verify versions against official docs before pinning — don't trust memory.
- **Language:** TypeScript everywhere.
- **Client build:** Vite. No React/Vue — UI is Phaser scenes + light DOM overlays.
- **Server:** Node + Fastify. One server serves the built client AND the API (single container, single port, binds `0.0.0.0`, respects `PORT`).
- **DB:** SQLite via Drizzle ORM (Postgres-ready). File lives on a persistent volume at `DB_PATH` (e.g. `/data/afterglow.sqlite`). Migrations + level seed run automatically on boot.

## Repo structure
```
client/   # Phaser game (Vite): scenes/ systems/ entities/ levels/ gfx/
server/   # Fastify API + static serving: routes/ db/ validation/
shared/   # types shared by client+server (Run, GhostBlob format, Level meta)
Dockerfile  docker-compose.yml  .env.example  README.md
```

## Commands
Keep these accurate as the project evolves. Intended package scripts:
- `npm run dev` — run client (Vite) + server together for local dev.
- `npm run build` — build the client and compile the server.
- `npm run start` — run the production server (serves built client + API).
- `npm run db:migrate` / `npm run db:seed` — migrations and level seeding (also run automatically on server boot).
- `docker compose up --build` — full local run mirroring production (mounts `./data` for SQLite).
- Always run a typecheck/build before committing to `main`.

## Key systems
- **Ghost recording:** sample player state (`x, y, facing, stateEnum`, one-shot events) each fixed tick; quantize + delta-encode + gzip; a 60s run should be a few KB. `GhostBlob` format defined in `shared/` and versioned.
- **Ghost racing:** download ghost(s) before the level starts, then pure local playback (no in-race networking). Render as translucent, distinctly-hued silhouettes with name + delta labels, on a layer behind gameplay-critical elements. Support N ghosts at once.
- **Timer:** ms precision, fixed-timestep driven; starts at the start line, stops at finish.
- **Death modes (per-run toggle, default Reset):**
  - *Reset* — death restarts the run (clean flow, top times).
  - *Checkpoint* — death respawns at last checkpoint; **the clock never stops**, so the finish is naturally slower (no artificial penalty). Checkpoints are inert in Reset mode.
  - Runs carry `death_mode`, `deaths`, `checkpoint_respawns`, `is_clean`. Primary leaderboard = clean runs only (Reset, or zero checkpoint respawns); checkpoint-assisted finishes are recorded but tagged/separated.
- **Combat is light & movement-focused:** one melee + dodge-roll, 2–3 enemy archetypes as obstacles. Specific weapons/powerup kit is open for design (categories: speed boost, extra air-dash, brief invincibility, shield). Coins are optional flair, never required to finish.

## Visual conventions
- Palette roles (centralized in `client/src/gfx/palette.ts`): player = electric cyan; coins = gold; powerups = violet/magenta; **danger = hot red-orange (reserved)**; platforms = dim desaturated blue-violet; finish = lime-white.
- Selective bloom (threshold-tuned, not whole-screen) + fake radial lighting on the player and emissive objects.
- Juice: screen shake, hitstop, squash & stretch, dash afterimages, brief chromatic aberration, slow-mo on death, camera lookahead.
- Heavy post-FX (CRT, grain, chromatic aberration, glow intensity, screen shake) are all toggleable in settings; ship a high-contrast/reduced-effects mode. Add shape redundancy for hazards (don't rely on color alone).

## Deployment workflow
- Develop on a working branch (or push to `main` if instructed); merge to `main` only when green. Push to `main` = live deploy via Coolify's GitHub watch/webhook.
- Conventional commit messages (`feat:`, `fix:`, `chore:` …). After a push, note what to verify and that Coolify will redeploy.
- Coolify needs: build pack = Dockerfile, env vars from `.env.example`, a persistent volume at `/data` (without it, leaderboard data is wiped on redeploy).
- Cloudflare Tunnel routes the public hostname to the Coolify service's internal `address:port`; no inbound ports opened. Details in `README.md`.
- Do **not** SSH into or modify the Coolify server or Cloudflare account directly — interact only through this repo.

## Don't
- Don't add real-time multiplayer netcode.
- Don't make logic/timing depend on framerate.
- Don't commit secrets or push a broken `main`.
- Don't let bloom/glow wash out platforms or hide hazards.
- Don't use procedural level generation for the MVP (fixed, versioned levels keep leaderboards fair) — leave a clean seam for it later.
- Don't add licensed/3rd-party game art; use original geometric neon visuals.
