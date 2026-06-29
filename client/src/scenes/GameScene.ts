import Phaser from 'phaser';
import type { DeathMode } from '@afterglow/shared';
import { FIXED_DT_MS, WORLD_W, WORLD_H } from '../constants';
import { InputSystem } from '../systems/InputSystem';
import { TimerSystem } from '../systems/TimerSystem';
import { Player } from '../entities/Player';
import { LEVEL_REGISTRY, DEFAULT_LEVEL_ID } from '../levels/LevelRegistry';
import type { Checkpoint } from '../levels/types';
import { PALETTE, toHex } from '../gfx/palette';

type RunPhase = 'waiting' | 'running' | 'finished';

export class GameScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private player!: Player;
  private timer!: TimerSystem;
  private accumulator = 0;

  // Level state
  private spawnX = 80;
  private spawnY = 640;
  private startLineX = 200;
  private finishLineX = 3760;
  private checkpoints: Checkpoint[] = [];

  // Run state
  private runPhase: RunPhase = 'waiting';
  private deathMode: DeathMode = 'reset';
  private deaths = 0;
  private checkpointRespawns = 0;
  private activeCheckpointId = 0;   // 0 = none; id of last touched checkpoint
  private activeSpawnX = 0;
  private activeSpawnY = 0;

  // UI
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private finishOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'Game' });
  }

  preload(): void { /* no file assets */ }

  create(): void {
    this.accumulator = 0;
    this.runPhase    = 'waiting';
    this.deaths      = 0;
    this.checkpointRespawns = 0;
    this.activeCheckpointId = 0;

    // ── Procedural textures ───────────────────────────────────────────────────
    this.makeCanvasTex('player-tex', 24, 44, toHex(PALETTE.PLAYER));
    this.makeCanvasTex('pixel',       1,  1, '#ffffff');

    // ── World bounds ──────────────────────────────────────────────────────────
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

    this.spawnX      = level.spawnX;
    this.spawnY      = level.spawnY;
    this.startLineX  = level.startLineX;
    this.finishLineX = level.finishLineX;
    this.checkpoints = level.checkpoints;
    this.activeSpawnX = this.spawnX;
    this.activeSpawnY = this.spawnY;

    // ── Player ────────────────────────────────────────────────────────────────
    this.player = new Player(this, this.spawnX, this.spawnY);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, level.platforms);

    // ── Camera ────────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── Input & timer ─────────────────────────────────────────────────────────
    this.inputSystem = new InputSystem(this);
    this.timer       = new TimerSystem();

    // ── HUD ───────────────────────────────────────────────────────────────────
    this.buildHUD(def.meta.name, def.meta.parTimeMs);
  }

  update(_time: number, delta: number): void {
    if (this.runPhase === 'finished') return;

    // ── Fixed-timestep accumulator ────────────────────────────────────────────
    this.accumulator += delta;
    while (this.accumulator >= FIXED_DT_MS) {
      const snap = this.inputSystem.snapshot();
      this.player.fixedUpdate(FIXED_DT_MS, snap);
      this.timer.tick(FIXED_DT_MS);
      this.accumulator -= FIXED_DT_MS;
    }

    // ── Trigger detection ─────────────────────────────────────────────────────
    const px = this.player.x;

    if (this.runPhase === 'waiting' && px >= this.startLineX) {
      this.startRun();
    }

    if (this.runPhase === 'running' && px >= this.finishLineX) {
      this.finishRun();
      return;
    }

    // Advance active checkpoint (highest id whose triggerX the player has passed)
    for (const cp of this.checkpoints) {
      if (px >= cp.triggerX && cp.id > this.activeCheckpointId) {
        this.activeCheckpointId = cp.id;
        this.activeSpawnX = cp.spawnX;
        this.activeSpawnY = cp.spawnY;
      }
    }

    // ── Fall-off respawn ──────────────────────────────────────────────────────
    if (this.player.y > WORLD_H + 60) {
      this.onDeath();
    }

    // ── Timer display ─────────────────────────────────────────────────────────
    this.timerText.setText(this.timer.format());
  }

  // ── Run lifecycle ───────────────────────────────────────────────────────────

  private startRun(): void {
    this.runPhase = 'running';
    this.timer.start();
    this.statusText.setVisible(false);
  }

  private finishRun(): void {
    this.runPhase = 'finished';
    this.timer.stop();
    this.showFinishOverlay();
  }

  private onDeath(): void {
    this.deaths++;

    if (this.deathMode === 'reset') {
      // Full run reset — back to before start line
      this.runPhase = 'waiting';
      this.timer.reset();
      this.activeCheckpointId = 0;
      this.activeSpawnX = this.spawnX;
      this.activeSpawnY = this.spawnY;
      this.statusText.setVisible(true);
      this.doRespawn(this.spawnX, this.spawnY);
    } else {
      // Checkpoint mode — clock never stops
      this.checkpointRespawns++;
      this.doRespawn(this.activeSpawnX, this.activeSpawnY);
    }
  }

  private doRespawn(x: number, y: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(0, 0);
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  private buildHUD(levelName: string, parTimeMs: number): void {
    const parStr = new TimerSystem();
    // Manually format par time
    const m  = Math.floor(parTimeMs / 60_000);
    const s  = Math.floor((parTimeMs % 60_000) / 1_000);
    const ms = parTimeMs % 1_000;
    const parFormatted = `${m}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
    void parStr;

    // Level name (top-left)
    this.add.text(10, 10, levelName, {
      fontSize: '14px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setScrollFactor(0).setDepth(100).setAlpha(0.7);

    // Par time hint
    this.add.text(10, 28, `PAR  ${parFormatted}`, {
      fontSize: '12px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setScrollFactor(0).setDepth(100).setAlpha(0.5);

    // Timer (top-right)
    this.timerText = this.add.text(1270, 10, '0:00.000', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffffff',
    }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);

    // "Cross start line" hint
    this.statusText = this.add.text(640, 680, '→  CROSS THE START LINE  →', {
      fontSize: '14px', fontFamily: 'monospace', color: toHex(PALETTE.PLAYER),
    }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 1).setAlpha(0.8);

    // Finish overlay (hidden until run ends)
    this.finishOverlay = this.buildFinishOverlay();
    this.finishOverlay.setVisible(false);
  }

  private buildFinishOverlay(): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(-640, -360, 1280, 720);

    const title = this.add.text(0, -60, 'FINISH', {
      fontSize: '64px', fontFamily: 'monospace', color: toHex(PALETTE.FINISH_LIME),
    }).setOrigin(0.5);

    const timeLabel = this.add.text(0, 20, '0:00.000', {
      fontSize: '40px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    const hint = this.add.text(0, 90, 'press any key to restart', {
      fontSize: '16px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setOrigin(0.5).setAlpha(0.7);

    const container = this.add.container(640, 360, [bg, title, timeLabel, hint]);
    container.setScrollFactor(0).setDepth(200);

    // Any key restarts
    this.input.keyboard!.once('keydown', () => {
      if (this.runPhase === 'finished') this.scene.restart();
    });

    // Store reference to timeLabel so we can update it
    (container as Phaser.GameObjects.Container & { timeLabel: Phaser.GameObjects.Text }).timeLabel = timeLabel;

    return container;
  }

  private showFinishOverlay(): void {
    const container = this.finishOverlay as Phaser.GameObjects.Container & { timeLabel: Phaser.GameObjects.Text };
    container.timeLabel.setText(this.timer.format());
    container.setVisible(true);

    // Re-register restart key (once was consumed if scene was restarted before)
    this.input.keyboard!.once('keydown', () => {
      if (this.runPhase === 'finished') this.scene.restart();
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private makeCanvasTex(key: string, w: number, h: number, color: string): void {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, w, h);
    tex.context.fillStyle = color;
    tex.context.fillRect(0, 0, w, h);
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
