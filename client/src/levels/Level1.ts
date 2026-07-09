import Phaser from 'phaser';
import type { LevelMeta } from '@afterglow/shared';
import { PALETTE } from '../gfx/palette';
import { WORLD_W } from '../constants';
import { Enemy } from '../entities/Enemy';
import { drawPlatformDecor } from '../gfx/drawPlatform';
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
  const group   = scene.physics.add.staticGroup();
  const platGfx = scene.add.graphics().setDepth(1);

  const addPlat = (
    x: number, y: number, w: number, h: number,
    color: number = PALETTE.PLATFORM,
  ): void => {
    const img = group.create(x + w / 2, y + h / 2, 'pixel') as Phaser.Physics.Arcade.Image;
    img.setDisplaySize(w, h);
    img.setVisible(false); // physics body only — graphics handles visuals
    img.refreshBody();
    drawPlatformDecor(platGfx, x, y, w, h, color);
  };

  // ── Ground floor ───────────────────────────────────────────────────────────
  addPlat(0,    FLOOR_Y, 1580,          FLOOR_H);
  addPlat(1900, FLOOR_Y, WORLD_W - 1900, FLOOR_H);

  // Start-line strip
  addPlat(192, FLOOR_Y, 16, FLOOR_H, PALETTE.PLAYER);

  // ── Section 1: Intro platforms (x 200–900) ─────────────────────────────────
  addPlat(300, 554, 140, 18);   // A
  addPlat(500, 434, 120, 18);   // B
  addPlat(680, 554, 160, 18);   // C
  addPlat(860, 434, 120, 18);   // D

  // ── Section 2: Climb & wall-jump (x 900–1580) ─────────────────────────────
  addPlat(950,  534, 110, 18);
  addPlat(1060, 320,  32, 300); // WALL
  addPlat(1150, 454, 170, 18);
  addPlat(1370, 294, 140, 18);
  addPlat(1510, 414, 110, 18);
  addPlat(1560, 534,  70, 18);

  // ── Dash gap (x 1580–1900) ─────────────────────────────────────────────────
  addPlat(1710, 580, 90, 18);   // mid-gap platform

  // ── Section 3: Ascending (x 1900–2850) ────────────────────────────────────
  addPlat(1960, 454, 150, 18);
  addPlat(2180, 334, 140, 18);
  addPlat(2380, 454, 150, 18);
  addPlat(2580, 314, 130, 18);
  addPlat(2740, 440, 150, 18);

  // ── Section 4: Descending sprint (x 2850–3760) ────────────────────────────
  addPlat(2870, 530, 190, 18);
  addPlat(3080, 430, 170, 18);
  addPlat(3280, 530, 190, 18);
  addPlat(3490, 430, 160, 18);

  // ── Finish zone ────────────────────────────────────────────────────────────
  addPlat(3760, FLOOR_Y, 160, FLOOR_H, PALETTE.FINISH_LIME);

  // ── Checkpoints ────────────────────────────────────────────────────────────
  const checkpoints: Checkpoint[] = [
    { id: 1, triggerX: 900,  spawnX: 920,  spawnY: 640 },
    { id: 2, triggerX: 1920, spawnX: 1930, spawnY: 640 },
    { id: 3, triggerX: 2850, spawnX: 2860, spawnY: 640 },
  ];

  // ── Coins ──────────────────────────────────────────────────────────────────
  // Placed 20px above platform surface to float visibly
  const coins = scene.physics.add.staticGroup();
  const addCoin = (x: number, y: number): void => {
    const c = coins.create(x, y, 'coin-tex') as Phaser.Physics.Arcade.Image;
    c.setDepth(4);
    c.refreshBody();
  };

  addCoin(370, 538);   // platform A (top 554)
  addCoin(558, 418);   // platform B (top 434)
  addCoin(755, 538);   // platform C (top 554)
  addCoin(920, 418);   // platform D (top 434)
  addCoin(1010, 654);  // floor — before wall section
  addCoin(1235, 438);  // catch-after-wall platform (top 454)
  addCoin(1440, 278);  // high platform (top 294)
  addCoin(2250, 318);  // ascending plat 2 (top 334)
  addCoin(2645, 298);  // ascending plat 4 (top 314)
  addCoin(3165, 414);  // descending plat 2 (top 430)

  // ── Enemies ─────────────────────────────────────────────────────────────────
  // Plain array — no physics group so Phaser never touches the body after init.
  // center_y = platform_top - half_height(18) for "standing" appearance.
  const enemies: Enemy[] = [];

  const addEnemy = (x: number, y: number, left: number, right: number): void => {
    const e = new Enemy(scene, x, y, left, right);
    e.setDepth(4);
    enemies.push(e);
  };

  addEnemy(920,  654, 860,  1000); // floor between D and CP1
  addEnemy(1230, 436, 1155, 1300); // catch-after-wall platform
  addEnemy(2450, 436, 2390, 2520); // ascending plat 3
  addEnemy(3350, 654, 3200, 3490); // floor near finish

  // ── Powerups (speed boost) ──────────────────────────────────────────────────
  const powerups = scene.physics.add.staticGroup();
  const addPowerup = (x: number, y: number): void => {
    const p = powerups.create(x, y, 'powerup-tex') as Phaser.Physics.Arcade.Image;
    p.setDepth(4);
    p.refreshBody();
  };

  addPowerup(1060, 654); // floor, before the wall section
  addPowerup(2720, 422); // platform (2740, 440)

  return {
    platforms: group,
    spawnX: 80,
    spawnY: 640,
    startLineX: 200,
    finishLineX: 3760,
    checkpoints,
    coins,
    enemies,
    powerups,
  };
}
