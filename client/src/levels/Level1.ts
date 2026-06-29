import Phaser from 'phaser';
import type { LevelMeta } from '@afterglow/shared';
import { PALETTE } from '../gfx/palette';
import { WORLD_W } from '../constants';
import type { BuiltLevel, Checkpoint } from './types';

export const LEVEL1_META: LevelMeta = {
  levelId: 'grid-01',
  name: 'GRID_01',
  version: '1',
  parTimeMs: 60_000,
};

const FLOOR_Y = 672;
const FLOOR_H = 48;

export function buildLevel1(scene: Phaser.Scene): BuiltLevel {
  const group = scene.physics.add.staticGroup();

  const add = (
    x: number, y: number, w: number, h: number,
    color: number = PALETTE.PLATFORM,
  ): void => {
    const img = group.create(x + w / 2, y + h / 2, 'pixel') as Phaser.Physics.Arcade.Image;
    img.setDisplaySize(w, h);
    img.setTint(color);
    img.refreshBody();
  };

  // ── Ground floor ───────────────────────────────────────────────────────────
  add(0,    FLOOR_Y, 1580,          FLOOR_H);                 // left of gap
  add(1900, FLOOR_Y, WORLD_W - 1900, FLOOR_H);               // right of gap

  // Start-line strip (bright stripe on floor at x=200)
  add(192, FLOOR_Y, 16, FLOOR_H, PALETTE.PLAYER);

  // ── Section 1: Intro platforms — single & double jump (x 200–900) ─────────
  add(300, 554, 140, 18);   // A: single jump from floor
  add(500, 434, 120, 18);   // B: double jump from A
  add(680, 554, 160, 18);   // C: descend
  add(860, 434, 120, 18);   // D: before CP1

  // ── Section 2: Climb & wall-jump (x 900–1580) ─────────────────────────────
  add(950,  534, 110, 18);  // run-up
  add(1060, 320,  32, 300); // WALL — tall, narrow
  add(1150, 454, 170, 18);  // catch after wall jump
  add(1370, 294, 140, 18);  // high platform
  add(1510, 414, 110, 18);  // descend
  add(1560, 534,  70, 18);  // run-up to gap

  // ── Dash gap (floor missing x 1580–1900, 320 px wide) ─────────────────────
  add(1710, 580, 90, 18);   // mid-gap platform (skilled chain-jump route)

  // ── Section 3: Ascending platforms (x 1900–2850) ──────────────────────────
  add(1960, 454, 150, 18);
  add(2180, 334, 140, 18);
  add(2380, 454, 150, 18);
  add(2580, 314, 130, 18);
  add(2740, 440, 150, 18);

  // ── Section 4: Descending sprint (x 2850–3760) ────────────────────────────
  add(2870, 530, 190, 18);
  add(3080, 430, 170, 18);
  add(3280, 530, 190, 18);
  add(3490, 430, 160, 18);

  // ── Finish zone — lime floor strip at x 3760–3920 ─────────────────────────
  add(3760, FLOOR_Y, 160, FLOOR_H, PALETTE.FINISH_LIME);

  // ── Checkpoints ────────────────────────────────────────────────────────────
  const checkpoints: Checkpoint[] = [
    { id: 1, triggerX: 900,  spawnX: 920,  spawnY: 640 },
    { id: 2, triggerX: 1920, spawnX: 1930, spawnY: 640 },
    { id: 3, triggerX: 2850, spawnX: 2860, spawnY: 640 },
  ];

  return {
    platforms: group,
    spawnX: 80,
    spawnY: 640,
    startLineX: 200,
    finishLineX: 3760,
    checkpoints,
  };
}
