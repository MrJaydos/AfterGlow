import Phaser from 'phaser';
import type { GhostBlob } from '@afterglow/shared';
import { FIXED_DT_MS } from '../constants';
import { PALETTE, toHex } from '../gfx/palette';

// Must match GhostRecorder.BYTES_PER_FRAME
const BYTES_PER_FRAME = 5;

export class GhostPlayer {
  private readonly view: DataView;
  private readonly totalFrames: number;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;

  /** Total recorded run time in ms — shown on finish screen. */
  readonly ghostTimeMs: number;

  private readonly name: string;

  // Factory: async because DecompressionStream is async
  static async fromBlob(
    scene: Phaser.Scene,
    blob: GhostBlob,
    opts: { tint?: number; name?: string } = {},
  ): Promise<GhostPlayer> {
    const compressed = base64ToUint8(blob.data);
    const raw        = await gunzip(compressed);
    return new GhostPlayer(scene, new DataView(raw.buffer), blob.header.frameCount, opts);
  }

  private constructor(
    scene: Phaser.Scene,
    view: DataView,
    frameCount: number,
    opts: { tint?: number; name?: string },
  ) {
    this.view        = view;
    this.totalFrames = frameCount;
    this.ghostTimeMs = frameCount * FIXED_DT_MS;
    this.name        = opts.name ?? '';
    const tint       = opts.tint ?? PALETTE.GHOST_DEFAULT;

    this.sprite = scene.add.image(0, 0, 'player-tex')
      .setTint(tint)
      .setAlpha(0.38)
      .setDepth(4)
      .setVisible(false);

    this.label = scene.add.text(0, 0, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: toHex(tint),
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    })
      .setDepth(10)
      .setOrigin(0.5, 1)
      .setVisible(false);
  }

  /**
   * Call every rendered frame while the run is active.
   * timerMs — current elapsed run time (from TimerSystem.elapsed)
   * playerX — live player x, used for the delta-time label
   */
  updateRender(timerMs: number, playerX: number): void {
    const frameIdx = Math.min(
      Math.max(0, Math.floor(timerMs / FIXED_DT_MS)),
      this.totalFrames - 1,
    );
    const off = frameIdx * BYTES_PER_FRAME;
    const gx  = this.view.getUint16(off,     false) / 8;
    const gy  = this.view.getUint16(off + 2, false) / 8;
    const gf  = this.view.getUint8 (off + 4) === 1 ? 1 : -1;

    this.sprite.setPosition(gx, gy).setFlipX(gf < 0).setVisible(true);
    this.label.setVisible(true);

    // Delta: positive = player behind ghost (slower), negative = player ahead (faster)
    const deltaMs = this.estimateDelta(timerMs, playerX);
    const sign    = deltaMs >= 0 ? '+' : '-';
    const secs    = (Math.abs(deltaMs) / 1000).toFixed(2);
    const color   = deltaMs <= 0 ? '#00ff88' : toHex(PALETTE.DANGER_RED);
    const text    = this.name ? `${this.name}\n${sign}${secs}` : `${sign}${secs}`;
    // Name label sits higher when two lines, so it clears the ghost sprite.
    this.label.setPosition(this.sprite.x, this.sprite.y - (this.name ? 42 : 30));
    this.label.setText(text).setColor(color);
  }

  hide(): void {
    this.sprite.setVisible(false);
    this.label.setVisible(false);
  }

  destroy(): void {
    this.sprite.destroy();
    this.label.destroy();
  }

  /**
   * Estimate how many ms the player is ahead (negative) or behind (positive)
   * the ghost, using the ghost's X position at the same time as a proxy for progress.
   * Approximates speed as the average of WALK and DASH speeds (~330 px/s).
   */
  private estimateDelta(timerMs: number, playerX: number): number {
    const frameIdx = Math.min(
      Math.max(0, Math.floor(timerMs / FIXED_DT_MS)),
      this.totalFrames - 1,
    );
    const ghostX   = this.view.getUint16(frameIdx * BYTES_PER_FRAME, false) / 8;
    const pixelGap = ghostX - playerX; // positive = ghost is further right = player slower
    const AVG_SPEED_PX_PER_S = 310;
    return (pixelGap / AVG_SPEED_PX_PER_S) * 1000;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') return data; // no compression was applied
  const ds     = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(data as Uint8Array<ArrayBuffer>);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
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

function base64ToUint8(b64: string): Uint8Array {
  const str  = atob(b64);
  const out  = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}
