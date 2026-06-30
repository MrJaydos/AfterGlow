import Phaser from 'phaser';
import type { DeathMode } from '@afterglow/shared';
import { FIXED_DT_MS, WORLD_W, WORLD_H } from '../constants';
import { InputSystem } from '../systems/InputSystem';
import { TimerSystem } from '../systems/TimerSystem';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { LEVEL_REGISTRY, DEFAULT_LEVEL_ID } from '../levels/LevelRegistry';
import type { Checkpoint } from '../levels/types';
import { PALETTE, toHex } from '../gfx/palette';

// Melee hit range (player-center to enemy-center in world units)
const ATTACK_RANGE_X = 68; // px in the facing direction (and a little behind)
const ATTACK_RANGE_Y = 44; // px above/below

type RunPhase = 'waiting' | 'running' | 'finished';

export class GameScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private player!: Player;
  private timer!: TimerSystem;
  private accumulator = 0;
  private hitstopMs   = 0; // freeze-frame when enemy dies

  // Level data
  private spawnX = 80;
  private spawnY = 640;
  private startLineX  = 200;
  private finishLineX = 3760;
  private checkpoints: Checkpoint[] = [];

  // Combat / collectibles
  private enemies: Enemy[] = [];
  private coinsCollected = 0;

  // Run state
  private runPhase: RunPhase = 'waiting';
  private deathMode: DeathMode = 'reset';
  private deaths = 0;
  private checkpointRespawns = 0;
  private activeCheckpointId = 0;
  private activeSpawnX = 0;
  private activeSpawnY = 0;

  // HUD objects
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private coinText!:   Phaser.GameObjects.Text;
  private boostText!:  Phaser.GameObjects.Text;
  private finishBg!:        Phaser.GameObjects.Rectangle;
  private finishTitle!:     Phaser.GameObjects.Text;
  private finishTimeLabel!: Phaser.GameObjects.Text;
  private finishHint!:      Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Game' });
  }

  preload(): void { /* no file assets */ }

  create(): void {
    this.accumulator        = 0;
    this.hitstopMs          = 0;
    this.runPhase           = 'waiting';
    this.deaths             = 0;
    this.checkpointRespawns = 0;
    this.activeCheckpointId = 0;
    this.coinsCollected     = 0;
    this.enemies            = [];

    // ── Textures ──────────────────────────────────────────────────────────────
    this.makeCanvasTex('player-tex',  24, 44, toHex(PALETTE.PLAYER));
    this.makeCanvasTex('enemy-tex',   28, 36, toHex(PALETTE.DANGER_RED));
    this.makeCanvasTex('pixel',        1,  1, '#ffffff');
    this.makeCanvasCircle('coin-tex',     16, toHex(PALETTE.COIN));
    this.makeCanvasCircle('powerup-tex',  20, toHex(PALETTE.POWERUP_VIOLET));

    // ── Physics world ─────────────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // ── Background ────────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG_TOP, PALETTE.BG_TOP, PALETTE.BG_BOTTOM, PALETTE.BG_BOTTOM, 1);
    bg.fillRect(0, 0, WORLD_W, WORLD_H);
    bg.setDepth(-10);
    this.buildGrid();

    // ── Level ─────────────────────────────────────────────────────────────────
    const def   = LEVEL_REGISTRY[DEFAULT_LEVEL_ID];
    const level = def.build(this);

    this.spawnX       = level.spawnX;
    this.spawnY       = level.spawnY;
    this.startLineX   = level.startLineX;
    this.finishLineX  = level.finishLineX;
    this.checkpoints  = level.checkpoints;
    this.activeSpawnX = this.spawnX;
    this.activeSpawnY = this.spawnY;

    // Enemy references — plain array, no physics group interference
    this.enemies = level.enemies;

    // ── Player ────────────────────────────────────────────────────────────────
    this.player = new Player(this, this.spawnX, this.spawnY);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, level.platforms);

    // ── Collectible overlaps (coins + powerups use StaticGroups — safe) ───────
    this.physics.add.overlap(
      this.player, level.coins,
      (_p, coin) => { this.onCoinCollect(coin as Phaser.Physics.Arcade.Image); },
    );

    this.physics.add.overlap(
      this.player, level.powerups,
      (_p, pu) => { this.onPowerupCollect(pu as Phaser.Physics.Arcade.Image); },
    );

    // Enemy contact is checked manually each fixed tick (see checkEnemyContact)
    // to avoid physics group issues that reset enemy body gravity.

    // ── Camera ────────────────────────────────────────────────────────────────
    // Viewport is 550 px tall (not the full 720) so the bottom 170 px of the
    // canvas is a touch-button zone that never overlaps gameplay.
    // Button centres sit at y=644 (radius 54 → top edge y=590), safely below
    // the 550 px viewport boundary.
    this.cameras.main.setViewport(0, 0, 1280, 550);
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── Systems ───────────────────────────────────────────────────────────────
    this.inputSystem = new InputSystem(this);
    this.timer       = new TimerSystem();

    // ── HUD ───────────────────────────────────────────────────────────────────
    this.buildHUD(def.meta.name, def.meta.parTimeMs);
  }

  update(_time: number, delta: number): void {
    if (this.runPhase === 'finished') return;

    // Hitstop: freeze everything for a brief flash when killing an enemy
    if (this.hitstopMs > 0) {
      this.hitstopMs -= delta;
      return;
    }

    // Fixed-timestep accumulator
    this.accumulator += delta;
    while (this.accumulator >= FIXED_DT_MS) {
      const snap = this.inputSystem.snapshot();
      this.player.fixedUpdate(FIXED_DT_MS, snap);
      for (const e of this.enemies) {
        if (e.active) e.fixedUpdate(FIXED_DT_MS);
      }
      this.timer.tick(FIXED_DT_MS);
      this.checkAttacks();
      this.checkEnemyContact();
      this.accumulator -= FIXED_DT_MS;
    }

    const px = this.player.x;

    // Start trigger
    if (this.runPhase === 'waiting' && px >= this.startLineX) {
      this.startRun();
    }

    // Finish trigger
    if (this.runPhase === 'running' && px >= this.finishLineX) {
      this.finishRun();
      return;
    }

    // Advance checkpoint
    for (const cp of this.checkpoints) {
      if (px >= cp.triggerX && cp.id > this.activeCheckpointId) {
        this.activeCheckpointId = cp.id;
        this.activeSpawnX = cp.spawnX;
        this.activeSpawnY = cp.spawnY;
      }
    }

    // Fall-off
    if (this.player.y > WORLD_H + 60) {
      this.onDeath();
    }

    // Update HUD
    this.timerText.setText(this.timer.format());
    this.boostText.setVisible(this.player.speedBoostMs > 0);
  }

  // ── Combat ───────────────────────────────────────────────────────────────────

  private checkAttacks(): void {
    if (!this.player.isAttacking) return;

    const px = this.player.x;
    const py = this.player.y;
    const f  = this.player.facing;

    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = (e.x - px) * f; // positive = enemy is in front of player
      const dy = Math.abs(e.y - py);
      if (dx > -20 && dx < ATTACK_RANGE_X && dy < ATTACK_RANGE_Y) {
        this.killEnemy(e);
      }
    }
  }

  private checkEnemyContact(): void {
    if (this.player.isInvincible) return;

    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const eb = e.body as Phaser.Physics.Arcade.Body;
      // AABB overlap test
      if (pb.right > eb.left && pb.left < eb.right &&
          pb.bottom > eb.top && pb.top < eb.bottom) {
        this.onDeath();
        return; // one death per tick is enough
      }
    }
  }

  private killEnemy(e: Enemy): void {
    e.destroy();
    this.hitstopMs = 80;
  }

  private onCoinCollect(coin: Phaser.Physics.Arcade.Image): void {
    coin.destroy();
    this.coinsCollected++;
    this.coinText.setText(`COINS  ${this.coinsCollected}`);
  }

  private onPowerupCollect(pu: Phaser.Physics.Arcade.Image): void {
    pu.destroy();
    this.player.applySpeedBoost(5000);
  }

  // ── Run lifecycle ─────────────────────────────────────────────────────────────

  private startRun(): void {
    this.runPhase = 'running';
    this.timer.start();
    this.statusText.setVisible(false);
  }

  private finishRun(): void {
    this.runPhase = 'finished';
    this.timer.stop();
    this.showFinishScreen();
  }

  private onDeath(): void {
    this.deaths++;
    if (this.deathMode === 'reset') {
      this.runPhase           = 'waiting';
      this.activeCheckpointId = 0;
      this.activeSpawnX       = this.spawnX;
      this.activeSpawnY       = this.spawnY;
      this.timer.reset();
      this.timerText.setText(this.timer.format());
      this.statusText.setVisible(true);
      this.doRespawn(this.spawnX, this.spawnY);
    } else {
      this.checkpointRespawns++;
      this.doRespawn(this.activeSpawnX, this.activeSpawnY);
    }
    // Grace iframes so the player doesn't instantly die again on respawn
    this.player.startInvincible(1200);
  }

  private doRespawn(x: number, y: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(0, 0);
  }

  // ── HUD / UI ──────────────────────────────────────────────────────────────────

  private buildHUD(levelName: string, parTimeMs: number): void {
    const m   = Math.floor(parTimeMs / 60_000);
    const s   = Math.floor((parTimeMs % 60_000) / 1_000);
    const ms  = parTimeMs % 1_000;
    const par = `${m}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;

    this.add.text(10, 10, levelName, {
      fontSize: '14px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setScrollFactor(0).setDepth(100).setAlpha(0.7);

    this.add.text(10, 28, `PAR  ${par}`, {
      fontSize: '12px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setScrollFactor(0).setDepth(100).setAlpha(0.5);

    this.coinText = this.add.text(10, 48, 'COINS  0', {
      fontSize: '12px', fontFamily: 'monospace', color: toHex(PALETTE.COIN),
    }).setScrollFactor(0).setDepth(100).setAlpha(0.85);

    this.timerText = this.add.text(1270, 10, '0:00.000', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);

    this.statusText = this.add.text(640, 530, '→  CROSS THE START LINE  →', {
      fontSize: '14px', fontFamily: 'monospace', color: toHex(PALETTE.PLAYER),
    }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 1).setAlpha(0.8);

    this.boostText = this.add.text(640, 56, '⚡ SPEED BOOST', {
      fontSize: '14px', fontFamily: 'monospace', color: toHex(PALETTE.POWERUP_VIOLET),
    }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0).setVisible(false);

    // Finish overlay — plain objects, no Container
    this.finishBg = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(200).setVisible(false);

    this.finishTitle = this.add.text(640, 280, 'FINISH', {
      fontSize: '72px', fontFamily: 'monospace', color: toHex(PALETTE.FINISH_LIME),
    }).setScrollFactor(0).setDepth(201).setOrigin(0.5).setVisible(false);

    this.finishTimeLabel = this.add.text(640, 370, '0:00.000', {
      fontSize: '44px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(201).setOrigin(0.5).setVisible(false);

    this.finishHint = this.add.text(640, 440, 'press any key to restart', {
      fontSize: '16px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setScrollFactor(0).setDepth(201).setOrigin(0.5).setAlpha(0.7).setVisible(false);
  }

  private showFinishScreen(): void {
    const coinSuffix = this.coinsCollected > 0 ? `  ·  ${this.coinsCollected} coins` : '';
    this.finishTimeLabel.setText(this.timer.format() + coinSuffix);
    this.finishBg.setVisible(true);
    this.finishTitle.setVisible(true);
    this.finishTimeLabel.setVisible(true);
    this.finishHint.setVisible(true);

    // Restart on any key (desktop) or any tap (mobile)
    this.input.keyboard!.once('keydown', () => { this.scene.restart(); });
    this.input.once('pointerdown',       () => { this.scene.restart(); });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private makeCanvasTex(key: string, w: number, h: number, color: string): void {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, w, h);
    tex.context.fillStyle = color;
    tex.context.fillRect(0, 0, w, h);
    tex.refresh();
  }

  private makeCanvasCircle(key: string, size: number, color: string): void {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, size, size);
    const r = size / 2;
    tex.context.fillStyle = color;
    tex.context.beginPath();
    tex.context.arc(r, r, r - 1, 0, Math.PI * 2);
    tex.context.fill();
    tex.refresh();
  }

  private buildGrid(): void {
    const g = this.add.graphics();
    g.lineStyle(1, PALETTE.GRID_LINE, 0.2);
    const step = 80;
    for (let x = 0; x <= WORLD_W; x += step) g.lineBetween(x, 0, x, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += step) g.lineBetween(0, y, WORLD_W, y);
    g.setDepth(-9).setScrollFactor(0.4, 0.4);
  }
}
