import Phaser from 'phaser';
import type { LevelMeta } from '@afterglow/shared';
import { PALETTE } from '../gfx/palette';
import { WORLD_W } from '../constants';
import { Enemy } from '../entities/Enemy';
import { Rusher } from '../entities/Rusher';
import { drawPlatformDecor } from '../gfx/drawPlatform';
import type { BuiltLevel, Checkpoint } from './types';

export const LEVEL3_META: LevelMeta = {
  levelId: 'grid-03',
  name: 'GRID_03',
  version: '1',
  parTimeMs: 90_000,
};

const FLOOR_Y = 672;
const FLOOR_H = 48;

export function buildLevel3(scene: Phaser.Scene): BuiltLevel {
  const group   = scene.physics.add.staticGroup();
  const platGfx = scene.add.graphics().setDepth(1);

  const addPlat = (
    x: number, y: number, w: number, h: number,
    color: number = PALETTE.PLATFORM,
  ): void => {
    const img = group.create(x + w / 2, y + h / 2, 'pixel') as Phaser.Physics.Arcade.Image;
    img.setDisplaySize(w, h);
    img.setVisible(false);
    img.refreshBody();
    drawPlatformDecor(platGfx, x, y, w, h, color);
  };

  // ── Ground floor ───────────────────────────────────────────────────────────
  addPlat(0,    FLOOR_Y, 400,          FLOOR_H);
  addPlat(2820, FLOOR_Y, WORLD_W - 2820, FLOOR_H);

  // Start-line strip
  addPlat(192, FLOOR_Y, 16, FLOOR_H, PALETTE.PLAYER);

  // ── Section 1: Zig-zag alternating low/high (x 300–1280) ─────────────────
  addPlat(300,  560, 120, 18);  // low A:  top=560
  addPlat(480,  410, 110, 18);  // high B: top=410
  addPlat(650,  560, 110, 18);  // low C:  top=560
  addPlat(820,  410, 110, 18);  // high D: top=410
  addPlat(990,  550, 120, 18);  // low E:  top=550
  addPlat(1160, 380, 110, 18);  // high F: top=380

  // ── Wall for wall-jump (x 1310) ───────────────────────────────────────────
  addPlat(1310, 250, 26, 310);  // WALL: spans y=250 to y=560

  // ── Section 2: Catch + altitude section (x 1380–2240) ────────────────────
  addPlat(1380, 270, 140, 18);  // catch: top=270
  addPlat(1570, 200, 120, 18);  // ascend: top=200
  addPlat(1750, 270, 120, 18);  // valley: top=270
  addPlat(1930, 200, 110, 18);  // peak: top=200
  addPlat(2110, 270, 130, 18);  // CP2 platform: top=270

  // ── Section 3: Descent cascade (x 2290–2820) ─────────────────────────────
  addPlat(2290, 370, 140, 18);  // descent 1: top=370
  addPlat(2480, 470, 150, 18);  // descent 2: top=470
  addPlat(2670, 570, 150, 18);  // descent 3: top=570

  // ── Section 4: Ground sprint gauntlet (x 2960–3530) ──────────────────────
  addPlat(2960, 560, 160, 18);  // hop: top=560
  addPlat(3170, 460, 140, 18);  // mid: top=460
  addPlat(3380, 560, 150, 18);  // hop: top=560

  // ── Finish zone ────────────────────────────────────────────────────────────
  addPlat(3760, FLOOR_Y, 160, FLOOR_H, PALETTE.FINISH_LIME);

  // ── Checkpoints ────────────────────────────────────────────────────────────
  const checkpoints: Checkpoint[] = [
    { id: 1, triggerX: 820,  spawnX: 840,  spawnY: 388 }, // high D top=410, center=388
    { id: 2, triggerX: 2110, spawnX: 2140, spawnY: 248 }, // CP2 platform top=270, center=248
    { id: 3, triggerX: 2820, spawnX: 2840, spawnY: 640 }, // back on ground
  ];

  // ── Coins ──────────────────────────────────────────────────────────────────
  const coins = scene.physics.add.staticGroup();
  const addCoin = (x: number, y: number): void => {
    const c = coins.create(x, y, 'coin-tex') as Phaser.Physics.Arcade.Image;
    c.setDepth(4);
    c.refreshBody();
  };

  addCoin(360,  544);  // low A: top=560 → 544
  addCoin(535,  394);  // high B: top=410 → 394
  addCoin(705,  544);  // low C: top=560 → 544
  addCoin(875,  394);  // high D: top=410 → 394
  addCoin(1050, 534);  // low E: top=550 → 534
  addCoin(1215, 364);  // high F: top=380 → 364
  addCoin(1450, 254);  // catch: top=270 → 254
  addCoin(1985, 184);  // peak 2: top=200 → 184
  addCoin(2555, 454);  // descent 2: top=470 → 454
  addCoin(3240, 444);  // sprint mid: top=460 → 444

  // ── Enemies ──────────────────────────────────────────────────────────────────
  const enemies: Enemy[] = [];

  const addEnemy = (x: number, y: number, left: number, right: number): void => {
    const e = new Enemy(scene, x, y, left, right);
    e.setDepth(4);
    enemies.push(e);
  };

  // Enemy y = platform top - half enemy height (18px)
  addEnemy(535,  392, 490,  580);   // high B (top=410)
  addEnemy(875,  392, 830,  920);   // high D (top=410)
  addEnemy(1450, 252, 1390, 1510);  // catch platform (top=270)
  addEnemy(1985, 182, 1940, 2035);  // peak 2 (top=200)
  addEnemy(3450, 654, 3300, 3650);  // ground near finish (y=654)

  // Rusher: guards the approach to the finish, charges when player enters range
  const rusher3 = new Rusher(scene, 3600, 654, 3450, 3720);
  rusher3.setDepth(4);
  enemies.push(rusher3);

  // ── Powerups ──────────────────────────────────────────────────────────────────
  const powerups = scene.physics.add.staticGroup();
  const addPowerup = (x: number, y: number): void => {
    const p = powerups.create(x, y, 'powerup-tex') as Phaser.Physics.Arcade.Image;
    p.setDepth(4);
    p.refreshBody();
  };

  addPowerup(280,  654);  // floor before zig-zag
  addPowerup(1810, 251);  // valley platform (top=270): 270-20=250
  addPowerup(3200, 441);  // sprint mid (top=460): 460-20=440

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
