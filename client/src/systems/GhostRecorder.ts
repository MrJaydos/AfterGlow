import type { GhostBlob } from '@afterglow/shared';
import { FIXED_DT_MS, TICK_RATE } from '../constants';

// Binary frame layout (5 bytes each, big-endian):
//   Uint16 x * 8   → 0.125 px precision, covers 0..4095 (max 32767 ✓)
//   Uint16 y * 8   → covers 0..720
//   Uint8  facing  → 1 = right, 0 = left
const BYTES_PER_FRAME = 5;
const SCHEMA_VERSION  = 1;
// 2 minutes at 60 Hz is more than any realistic run
const MAX_FRAMES = TICK_RATE * 120;

export class GhostRecorder {
  private readonly levelId: string;
  private readonly levelVersion: string;
  private readonly buf: ArrayBuffer;
  private readonly view: DataView;
  private frameCount = 0;

  constructor(levelId: string, levelVersion: string) {
    this.levelId      = levelId;
    this.levelVersion = levelVersion;
    this.buf  = new ArrayBuffer(MAX_FRAMES * BYTES_PER_FRAME);
    this.view = new DataView(this.buf);
  }

  record(x: number, y: number, facing: 1 | -1): void {
    if (this.frameCount >= MAX_FRAMES) return;
    const off = this.frameCount * BYTES_PER_FRAME;
    this.view.setUint16(off,     Math.round(x * 8), false);
    this.view.setUint16(off + 2, Math.round(y * 8), false);
    this.view.setUint8 (off + 4, facing === 1 ? 1 : 0);
    this.frameCount++;
  }

  get frames(): number { return this.frameCount; }

  async encode(): Promise<GhostBlob> {
    const raw  = new Uint8Array(this.buf, 0, this.frameCount * BYTES_PER_FRAME);
    const gz   = await gzip(raw);
    return {
      header: {
        schemaVersion: SCHEMA_VERSION,
        levelId:       this.levelId,
        levelVersion:  this.levelVersion,
        tickRate:      Math.round(1000 / FIXED_DT_MS),
        frameCount:    this.frameCount,
      },
      data: uint8ToBase64(gz),
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function gzip(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return data; // old browser fallback
  const cs     = new CompressionStream('gzip');
  const writer = cs.writable.getWriter();
  writer.write(data as Uint8Array<ArrayBuffer>);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as Uint8Array);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out   = new Uint8Array(total);
  let   pos   = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

function uint8ToBase64(buf: Uint8Array): string {
  let s = '';
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s);
}
