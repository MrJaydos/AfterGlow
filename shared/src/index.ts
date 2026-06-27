// Run / leaderboard

export type DeathMode = 'reset' | 'checkpoint';

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'dash' | 'wall-slide' | 'attack' | 'dead';

export interface Run {
  id: string;
  playerName: string;
  playerClientId: string;
  levelId: string;
  levelVersion: string;
  timeMs: number;
  coins: number;
  deathMode: DeathMode;
  deaths: number;
  checkpointRespawns: number;
  isClean: boolean;
  createdAt: string;
  ghostRef?: string;
}

export interface LeaderboardEntry extends Run {
  rank: number;
}

// Level metadata

export interface LevelMeta {
  levelId: string;
  name: string;
  version: string;
  parTimeMs: number;
}

// Ghost blob format (versioned)

export interface GhostBlobHeader {
  schemaVersion: number;
  levelId: string;
  levelVersion: string;
  tickRate: number;
  frameCount: number;
}

export interface GhostBlob {
  header: GhostBlobHeader;
  /** base64-encoded gzip of delta-encoded frame stream */
  data: string;
}

export interface GhostFrame {
  x: number;
  y: number;
  facing: 1 | -1;
  state: PlayerState;
}

// API shapes

export interface SubmitRunRequest {
  playerName: string;
  playerClientId: string;
  levelId: string;
  version: string;
  timeMs: number;
  coins: number;
  deathMode: DeathMode;
  deaths: number;
  checkpointRespawns: number;
  ghostBlob?: string;
}

export interface SubmitRunResponse {
  runId: string;
  rank: number;
  isClean: boolean;
}
