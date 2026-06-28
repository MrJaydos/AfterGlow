import Phaser from 'phaser';
import { PALETTE } from '../gfx/palette';
import { WORLD_W, WORLD_H } from '../constants';

export interface LevelData {
  platforms: Phaser.Physics.Arcade.StaticGroup;
  spawnX: number;
  spawnY: number;
}

const FLOOR_Y = 672;
const FLOOR_H = 48;

export function buildTestLevel(scene: Phaser.Scene): LevelData {
  // 1×1 white pixel texture used for all platform tiles (tinted + scaled)
  if (!scene.textures.exists('pixel')) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('pixel', 1, 1);
    g.destroy();
  }

  const group = scene.physics.add.staticGroup();

  const add = (
    x: number, y: number, w: number, h: number,
    color: number = PALETTE.PLATFORM,
  ): Phaser.Physics.Arcade.Image => {
    const img = group.create(x + w / 2, y + h / 2, 'pixel') as Phaser.Physics.Arcade.Image;
    img.setDisplaySize(w, h);
    img.setTint(color);
    img.refreshBody();
    return img;
  };

  // ── Ground floor (gap at x 1700–1960 for dash section) ──────────────────────
  add(0,    FLOOR_Y, 1700,          FLOOR_H);
  add(1960, FLOOR_Y, WORLD_W - 1960, FLOOR_H);

  // ── Section 1: Basic jumping & double-jump (x 0–900) ───────────────────────
  add(120,  556, 180, 18);   // low ledge — single jump from ground
  add(360,  440, 150, 18);   // mid ledge — second jump from low ledge
  add(560,  320, 140, 18);   // high ledge — needs double jump
  add(750,  456, 170, 18);   // descent ledge

  // ── Section 2: Wall-slide & wall-jump (x 900–1400) ─────────────────────────
  add(920,  556, 120, 18);   // run-up ledge to wall
  add(1060, 340, 36,  280);  // WALL — tall and narrow to slide on
  add(1140, 470, 190, 18);   // landing ledge after wall jump
  add(1380, 540, 220, 18);   // continuation

  // ── Section 3: Dash across gap (x 1600–2100) ───────────────────────────────
  // Floor gap already cut (x 1700–1960). Players dash across or fall.
  add(1620, 556, 300, 18);   // long run-up before gap (raised — extra room)
  add(1960, 590, 220, 18);   // catch ledge after gap (sits just above gap floor)

  // ── Section 4: High platforming (x 2100–3200) ──────────────────────────────
  add(2160, 540, 180, 18);
  add(2390, 420, 160, 18);
  add(2610, 300, 150, 18);
  add(2810, 420, 160, 18);
  add(3020, 300, 150, 18);
  add(3200, 460, 180, 18);

  // ── Finish zone (placeholder — Phase 3 adds the real finish trigger) ────────
  add(3500, 588, 420, 18, PALETTE.FINISH_LIME);

  // ── Spawn ──────────────────────────────────────────────────────────────────
  return { platforms: group, spawnX: 80, spawnY: 620 };
}
