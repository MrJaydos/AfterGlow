import type { GhostBlob } from '@afterglow/shared';

const KEY_PREFIX = 'ag_ghost_';

export const GhostManager = {
  /** Save blob only if newTimeMs is faster than the stored PB for this level. */
  save(blob: GhostBlob, newTimeMs: number): void {
    const existing = GhostManager.load(blob.header.levelId);
    if (existing) {
      const existingMs = (existing.header.frameCount / existing.header.tickRate) * 1000;
      if (newTimeMs >= existingMs) return; // not a PB — don't overwrite
    }
    try {
      localStorage.setItem(KEY_PREFIX + blob.header.levelId, JSON.stringify(blob));
    } catch {
      // localStorage full or unavailable — silently skip
    }
  },

  load(levelId: string): GhostBlob | null {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + levelId);
      if (!raw) return null;
      const blob = JSON.parse(raw) as GhostBlob;
      // Schema version guard — discard stale blobs
      if (blob.header?.schemaVersion !== 1) return null;
      return blob;
    } catch {
      return null;
    }
  },

  clear(levelId: string): void {
    localStorage.removeItem(KEY_PREFIX + levelId);
  },

  /** Ghost's recorded finish time in ms (computed from header). */
  ghostTimeMs(blob: GhostBlob): number {
    return (blob.header.frameCount / blob.header.tickRate) * 1000;
  },
};

