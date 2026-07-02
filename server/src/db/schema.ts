import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const runs = sqliteTable('runs', {
  id:                 text('id').primaryKey(),
  playerName:         text('player_name').notNull(),
  playerClientId:     text('player_client_id').notNull(),
  levelId:            text('level_id').notNull(),
  levelVersion:       text('level_version').notNull(),
  timeMs:             real('time_ms').notNull(),
  coins:              integer('coins').notNull().default(0),
  deathMode:          text('death_mode').notNull(),
  deaths:             integer('deaths').notNull().default(0),
  checkpointRespawns: integer('checkpoint_respawns').notNull().default(0),
  isClean:            integer('is_clean', { mode: 'boolean' }).notNull().default(true),
  createdAt:          text('created_at').notNull(),
  // Serialized GhostBlob (JSON string) for this run — nullable; enables ghost racing.
  ghostBlob:          text('ghost_blob'),
});

export type Run = typeof runs.$inferSelect;
