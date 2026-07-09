import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from './schema';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'afterglow.sqlite');

// Exported so routes can use raw prepared statements for complex queries
export let sqlite: Database.Database;
export let db: ReturnType<typeof drizzle<typeof schema>>;

export function initDb(): void {
  // Warn loudly if DB is not on a persistent volume path — data will be lost on redeploy
  if (!DB_PATH.startsWith('/data')) {
    console.warn('[db] ⚠️  DB_PATH is not under /data — leaderboard data will be lost on redeploy!');
    console.warn('[db] ⚠️  Set DB_PATH=/data/afterglow.sqlite and mount /data as a persistent volume.');
  }
  console.log(`[db] Opening SQLite at ${DB_PATH}`);
  sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Schema version 1 — CREATE IF NOT EXISTS so re-runs are safe
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id                  TEXT    PRIMARY KEY,
      player_name         TEXT    NOT NULL,
      player_client_id    TEXT    NOT NULL,
      level_id            TEXT    NOT NULL,
      level_version       TEXT    NOT NULL,
      time_ms             REAL    NOT NULL,
      coins               INTEGER NOT NULL DEFAULT 0,
      death_mode          TEXT    NOT NULL,
      deaths              INTEGER NOT NULL DEFAULT 0,
      checkpoint_respawns INTEGER NOT NULL DEFAULT 0,
      is_clean            INTEGER NOT NULL DEFAULT 1,
      created_at          TEXT    NOT NULL,
      ghost_blob          TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_runs_board
      ON runs (level_id, is_clean, time_ms);
  `);

  // Migration: add ghost_blob to tables created before Phase 8.
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so probe the schema first.
  const cols = sqlite.prepare(`PRAGMA table_info(runs)`).all() as { name: string }[];
  if (!cols.some(c => c.name === 'ghost_blob')) {
    sqlite.exec(`ALTER TABLE runs ADD COLUMN ghost_blob TEXT`);
  }

  db = drizzle(sqlite, { schema });
  console.log('[db] Ready');
}
