import Phaser from 'phaser';
import { PALETTE } from './palette';

/**
 * Draws a pixel-art-style platform onto a shared Graphics object.
 * Call alongside each physics-body creation; the graphics provides all visuals.
 */
export function drawPlatformDecor(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  color: number = PALETTE.PLATFORM,
): void {
  const isFinish = color === PALETTE.FINISH_LIME;
  const isStart  = color === PALETTE.PLAYER;
  const isWall   = h > w * 2;

  // ── Finish zone ──────────────────────────────────────────────────────────────
  if (isFinish) {
    g.fillStyle(0x0d2200, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(3, PALETTE.FINISH_LIME, 1);
    g.lineBetween(x, y + 1, x + w, y + 1);
    g.lineStyle(1, PALETTE.FINISH_LIME, 0.35);
    g.lineBetween(x, y + 5, x + w, y + 5);
    return;
  }

  // ── Start-line strip ─────────────────────────────────────────────────────────
  if (isStart) {
    g.fillStyle(0x001620, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(2, PALETTE.PLAYER, 1);
    g.lineBetween(x + Math.floor(w / 2), y, x + Math.floor(w / 2), y + h);
    return;
  }

  // ── Vertical wall ────────────────────────────────────────────────────────────
  if (isWall) {
    g.fillStyle(0x080818, 1);
    g.fillRect(x, y, w, h);
    // Neon edge lines on both sides
    g.lineStyle(2, PALETTE.PLATFORM_GLOW, 0.7);
    g.lineBetween(x + 1,     y, x + 1,     y + h);
    g.lineBetween(x + w - 2, y, x + w - 2, y + h);
    // Subtle horizontal "stone seams" every 32px
    g.lineStyle(1, 0x161630, 1);
    for (let sy = y + 32; sy < y + h; sy += 32) {
      g.lineBetween(x + 2, sy, x + w - 2, sy);
    }
    return;
  }

  // ── Standard horizontal platform ─────────────────────────────────────────────
  // Dark stone body
  g.fillStyle(0x080818, 1);
  g.fillRect(x, y, w, h);

  // Subtle vertical "brick" divisions every 32 px
  g.lineStyle(1, 0x121228, 1);
  for (let bx = x + 32; bx < x + w; bx += 32) {
    g.lineBetween(bx, y + 3, bx, y + h - 1);
  }

  // Top neon edge — two-tone: bright cap + glow line below
  g.lineStyle(1, 0xaaaaee, 0.55);      // brightest cap (top pixel)
  g.lineBetween(x, y, x + w, y);
  g.lineStyle(2, PALETTE.PLATFORM_GLOW, 0.9); // main glow
  g.lineBetween(x, y + 2, x + w, y + 2);
  g.lineStyle(1, PALETTE.PLATFORM_GLOW, 0.25); // fade-out
  g.lineBetween(x, y + 4, x + w, y + 4);

  // Subtle bottom shadow edge
  g.lineStyle(1, 0x0a0a30, 1);
  g.lineBetween(x, y + h - 1, x + w, y + h - 1);
}
