import type { FastifyInstance } from 'fastify';
import { eq, and, lt, asc } from 'drizzle-orm';
import { db, sqlite } from '../db/index';
import { runs } from '../db/schema';

// ── Fastify JSON schema ───────────────────────────────────────────────────────

const submitBody = {
  type: 'object',
  required: ['playerName', 'playerClientId', 'levelId', 'version', 'timeMs', 'deathMode'],
  properties: {
    playerName:         { type: 'string', minLength: 1, maxLength: 32 },
    playerClientId:     { type: 'string', minLength: 1, maxLength: 64 },
    levelId:            { type: 'string', minLength: 1, maxLength: 32 },
    version:            { type: 'string', minLength: 1, maxLength: 16 },
    timeMs:             { type: 'number', minimum: 1000, maximum: 600_000 },
    coins:              { type: 'integer', minimum: 0, default: 0 },
    deathMode:          { type: 'string', enum: ['reset', 'checkpoint'] },
    deaths:             { type: 'integer', minimum: 0, default: 0 },
    checkpointRespawns: { type: 'integer', minimum: 0, default: 0 },
    ghostBlob:          { type: 'string' },
  },
  additionalProperties: false,
} as const;

const submitReply = {
  200: {
    type: 'object',
    properties: {
      runId:   { type: 'string' },
      rank:    { type: 'integer' },
      isClean: { type: 'boolean' },
    },
  },
};

const leaderboardReply = {
  200: {
    type: 'object',
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rank:               { type: 'integer' },
            id:                 { type: 'string' },
            playerName:         { type: 'string' },
            playerClientId:     { type: 'string' },
            timeMs:             { type: 'number' },
            coins:              { type: 'integer' },
            deathMode:          { type: 'string' },
            deaths:             { type: 'integer' },
            checkpointRespawns: { type: 'integer' },
            isClean:            { type: 'boolean' },
            createdAt:          { type: 'string' },
          },
        },
      },
    },
  },
};

// ── Route handler types ───────────────────────────────────────────────────────

interface SubmitBody {
  playerName: string;
  playerClientId: string;
  levelId: string;
  version: string;
  timeMs: number;
  coins: number;
  deathMode: 'reset' | 'checkpoint';
  deaths: number;
  checkpointRespawns: number;
  ghostBlob?: string;
}

interface LeaderboardRow {
  id: string;
  player_name: string;
  player_client_id: string;
  level_id: string;
  level_version: string;
  time_ms: number;
  coins: number;
  death_mode: string;
  deaths: number;
  checkpoint_respawns: number;
  is_clean: number;
  created_at: string;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export async function runRoutes(server: FastifyInstance): Promise<void> {

  // POST /api/runs — submit a completed run
  server.post<{ Body: SubmitBody }>('/api/runs', {
    schema: { body: submitBody, response: submitReply },
  }, async (req, reply) => {
    const body     = req.body;
    const isClean  = body.deathMode === 'reset' || body.checkpointRespawns === 0;
    const id       = crypto.randomUUID();
    const now      = new Date().toISOString();

    db.insert(runs).values({
      id,
      playerName:         body.playerName.trim(),
      playerClientId:     body.playerClientId,
      levelId:            body.levelId,
      levelVersion:       body.version,
      timeMs:             body.timeMs,
      coins:              body.coins ?? 0,
      deathMode:          body.deathMode,
      deaths:             body.deaths ?? 0,
      checkpointRespawns: body.checkpointRespawns ?? 0,
      isClean,
      createdAt:          now,
    }).run();

    // Rank = number of faster clean runs + 1
    const rankRow = sqlite.prepare(
      `SELECT count(*) as cnt FROM runs
       WHERE level_id = ? AND is_clean = 1 AND time_ms < ?`
    ).get(body.levelId, body.timeMs) as { cnt: number };

    return reply.send({ runId: id, rank: rankRow.cnt + 1, isClean });
  });

  // GET /api/leaderboard/:levelId — top times (one per player, clean only)
  server.get<{ Params: { levelId: string }; Querystring: { limit?: string } }>(
    '/api/leaderboard/:levelId',
    { schema: { response: leaderboardReply } },
    async (req, reply) => {
      const { levelId } = req.params;
      const limit = Math.min(parseInt(req.query.limit ?? '10', 10), 50);

      // Best time per unique playerClientId, clean runs only
      const rows = sqlite.prepare(`
        SELECT id, player_name, player_client_id, level_id, level_version,
               MIN(time_ms) as time_ms, coins, death_mode, deaths,
               checkpoint_respawns, is_clean, created_at
        FROM runs
        WHERE level_id = ? AND is_clean = 1
        GROUP BY player_client_id
        ORDER BY time_ms ASC
        LIMIT ?
      `).all(levelId, limit) as LeaderboardRow[];

      const entries = rows.map((r, i) => ({
        rank:               i + 1,
        id:                 r.id,
        playerName:         r.player_name,
        playerClientId:     r.player_client_id,
        timeMs:             r.time_ms,
        coins:              r.coins,
        deathMode:          r.death_mode,
        deaths:             r.deaths,
        checkpointRespawns: r.checkpoint_respawns,
        isClean:            r.is_clean === 1,
        createdAt:          r.created_at,
      }));

      return reply.send({ entries });
    },
  );
}
