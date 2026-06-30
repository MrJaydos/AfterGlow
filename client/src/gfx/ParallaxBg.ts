import Phaser from 'phaser';
import { PALETTE } from './palette';
import { WORLD_W, WORLD_H } from '../constants';

// Deterministic PRNG (mulberry32) — same visual every run
function mkRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) ^ (s + Math.imul(s ^ (s >>> 7), 61 | s))) >>> 0;
    return s / 4294967296;
  };
}

// Minimum layer width to cover the viewport at all camera positions:
//   w >= 1280 + (WORLD_W - 1280) * scrollFactor
function layerW(sf: number): number {
  return Math.ceil(1280 + (WORLD_W - 1280) * sf) + 64;
}

export function buildParallax(scene: Phaser.Scene): void {
  // ── Layer 1: Stars (extremely slow — feels like deep space) ───────────────
  const starG = scene.add.graphics()
    .setDepth(-19)
    .setScrollFactor(0.05, 0.02);

  const r1 = mkRng(0xdeadbeef);
  const sw  = layerW(0.05);
  for (let i = 0; i < 220; i++) {
    const x     = r1() * sw;
    const y     = r1() * WORLD_H * 0.9;
    const size  = r1() < 0.82 ? 1 : 2;
    const alpha = 0.25 + r1() * 0.65;
    const col   = r1() < 0.25 ? 0xaaccff : 0xffffff; // occasional blue tint
    starG.fillStyle(col, alpha);
    starG.fillRect(x, y, size, size);
  }

  // ── Layer 2: Horizon atmospheric glow ────────────────────────────────────
  const horizG = scene.add.graphics()
    .setDepth(-18)
    .setScrollFactor(0.15, 0.05);

  const hw = layerW(0.15);
  // Warm magenta bloom rising from the horizon line (~y 350)
  horizG.fillGradientStyle(0x000000, 0x000000, PALETTE.HORIZON, PALETTE.HORIZON, 0, 0, 0.14, 0.14);
  horizG.fillRect(0, 200, hw, 280);
  horizG.fillGradientStyle(PALETTE.HORIZON, PALETTE.HORIZON, 0x000000, 0x000000, 0.14, 0.14, 0, 0);
  horizG.fillRect(0, 480, hw, 160);

  // Faint scan lines through the atmospheric band
  horizG.lineStyle(1, PALETTE.GRID_BRIGHT, 0.07);
  for (let y = 390; y < 510; y += 22) {
    horizG.lineBetween(0, y, hw, y);
  }

  // ── Layer 3: City silhouettes ─────────────────────────────────────────────
  const cityG = scene.add.graphics()
    .setDepth(-17)
    .setScrollFactor(0.28, 0.08);

  const r2 = mkRng(0xcafe1234);
  const cw  = layerW(0.28);
  let   bx  = 0;
  while (bx < cw) {
    const bw = 28 + r2() * 100;
    const bh = 55 + r2() * 270;
    const by = WORLD_H - bh - (WORLD_H - 720); // sit on the world floor

    // Building body — very dark violet, slightly different per building
    cityG.fillStyle(0x09081c + Math.floor(r2() * 0x040204), 1);
    cityG.fillRect(bx, by, bw, bh);

    // Roofline edge in dim violet
    cityG.lineStyle(1, PALETTE.PLATFORM_GLOW, 0.2 + r2() * 0.2);
    cityG.lineBetween(bx, by, bx + bw, by);

    // Lit windows
    const winCount = Math.floor(r2() * 5);
    for (let w = 0; w < winCount; w++) {
      const wx = bx + 5 + r2() * Math.max(0, bw - 14);
      const wy = by + 12 + r2() * Math.max(0, bh - 24);
      const wc = r2() > 0.45 ? PALETTE.POWERUP_VIOLET : PALETTE.PLATFORM_GLOW;
      cityG.fillStyle(wc, 0.4 + r2() * 0.45);
      cityG.fillRect(wx, wy, 3, 5);
    }

    bx += bw + 4 + r2() * 28;
  }
}
