import Phaser from 'phaser';
import type { LevelMeta } from '@afterglow/shared';
import { PALETTE } from '../gfx/palette';
import { WORLD_W } from '../constants';
import { Enemy } from '../entities/Enemy';
import type { BuiltLevel, Checkpoint } from './types';

export const LEVEL2_META: LevelMeta = {
  levelId: 'grid-02',
  name: 'GRID_02',
  version: '1',
  parTimeMs: 75_000,
};

const FLOOR_Y = 672;
const FLOOR_H = 48;

export function buildLevel2(scene: Phaser.Scene): BuiltLevel {
  const group = scene.physics.add.staticGroup();

  const addPlat = (
    x: number, y: number, w: number, h: number,
    color: number = PALETTE.PLATFORM,
  ): void => {
    const img = group.create(x + w / 2, y + h / 2, 'pixel') as Phaser.Physics.Arcade.Image;
    img.setDisplaySize(w, h);
    img.setTint(color);
    img.refreshBody();
  };

  // ── Ground floor ───────────────────────────────────────────────────────────
  addPlat(0,    FLOOR_Y, 480,          FLOOR_H);
  addPlat(2650, FLOOR_Y, WORLD_W - 2650, FLOOR_H);

  // Start-line strip
  addPlat(192, FLOOR_Y, 16, FLOOR_H, PALETTE.PLAYER);

  // ── Section 1: Steps ascending (x 310–968) ────────────────────────────────
  addPlat(310, 560, 130, 18);   // A: top=560
  addPlat(490, 470, 120, 18);   // B: top=470
  addPlat(668, 380, 130, 18);   // C: top=380
  addPlat(848, 295, 120, 18);   // D: top=295

  // ── Wall for wall-jump (x 1000) ───────────────────────────────────────────
  addPlat(1000, 220, 26, 350);  // WALL: spans y=220 to y=570

  // ── Section 2: Catch + sky platforms (x 1080–2130) ────────────────────────
  addPlat(1080, 320, 140, 18);  // catch after wall: top=320
  addPlat(1270, 240, 130, 18);  // entry: top=240
  addPlat(1450, 160, 120, 18);  // first sky peak: top=160
  addPlat(1630, 240, 120, 18);  // sky valley: top=240
  addPlat(1810, 160, 120, 18);  // second sky peak: top=160
  addPlat(1990, 240, 140, 18);  // sky exit / CP2 platform: top=240

  // ── Section 3: Descent (x 2170–2700) ─────────────────────────────────────
  addPlat(2170, 340, 140, 18);  // descent 1: top=340
  addPlat(2360, 450, 150, 18);  // descent 2: top=450
  addPlat(2560, 570, 140, 18);  // descent 3: top=570

  // ── Section 4: Sprint (x 2770–3710) ──────────────────────────────────────
  addPlat(2770, 570, 160, 18);  // hop: top=570
  addPlat(2980, 480, 150, 18);  // mid: top=480
  addPlat(3180, 560, 160, 18);  // hop: top=560
  addPlat(3380, 480, 150, 18);  // mid: top=480
  addPlat(3560, 560, 150, 18);  // near finish: top=560

  // ── Finish zone ────────────────────────────────────────────────────────────
  addPlat(3760, FLOOR_Y, 160, FLOOR_H, PALETTE.FINISH_LIME);

  // ── Checkpoints ────────────────────────────────────────────────────────────
  const checkpoints: Checkpoint[] = [
    { id: 1, triggerX: 848,  spawnX: 880,  spawnY: 273 }, // step D top=295, center=273
    { id: 2, triggerX: 1990, spawnX: 2020, spawnY: 218 }, // sky platform top=240, center=218
    { id: 3, triggerX: 2650, spawnX: 2680, spawnY: 640 }, // back on ground
  ];

  // ── Coins ──────────────────────────────────────────────────────────────────
  const coins = scene.physics.add.staticGroup();
  const addCoin = (x: number, y: number): void => {
    const c = coins.create(x, y, 'coin-tex') as Phaser.Physics.Arcade.Image;
    c.setDepth(4);
    c.refreshBody();
  };

  addCoin(375,  544);  // step A: top=560 → 560-16=544
  addCoin(550,  454);  // step B: top=470 → 470-16=454
  addCoin(733,  364);  // step C: top=380 → 380-16=364
  addCoin(908,  279);  // step D: top=295 → 295-16=279
  addCoin(1150, 304);  // catch: top=320 → 304
  addCoin(1510, 144);  // sky peak 1: top=160 → 144
  addCoin(1870, 144);  // sky peak 2: top=160 → 144
  addCoin(2435, 434);  // descent 2: top=450 → 434
  addCoin(3055, 464);  // sprint mid 1: top=480 → 464
  addCoin(3455, 464);  // sprint mid 2: top=480 → 464

  // ── Enemies ──────────────────────────────────────────────────────────────────
  const enemies: Enemy[] = [];

  const addEnemy = (x: number, y: number, left: number, right: number): void => {
    const e = new Enemy(scene, x, y, left, right);
    e.setDepth(4);
    enemies.push(e);
  };

  // Enemy y = platform top - half enemy height (18px)
  addEnemy(550,  452, 500,  600);   // step B (top=470): y=452
  addEnemy(1150, 302, 1090, 1210);  // catch platform (top=320): y=302
  addEnemy(1870, 142, 1820, 1920);  // sky peak 2 (top=160): y=142
  addEnemy(3055, 462, 2990, 3120);  // sprint mid (top=480): y=462

  // ── Powerups ──────────────────────────────────────────────────────────────────
  const powerups = scene.physics.add.staticGroup();
  const addPowerup = (x: number, y: number): void => {
    const p = powerups.create(x, y, 'powerup-tex') as Phaser.Physics.Arcade.Image;
    p.setDepth(4);
    p.refreshBody();
  };

  addPowerup(250,  654);  // floor before steps
  addPowerup(2060, 221);  // sky exit platform (top=240): 240-20=220

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
