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
import { buildParallax } from '../gfx/ParallaxBg';
import { GhostRecorder } from '../systems/GhostRecorder';
import { GhostPlayer } from '../systems/GhostPlayer';
import { GhostManager } from '../systems/GhostManager';

// Melee hit range (player-center to enemy-center in world units)
const ATTACK_RANGE_X = 68;
const ATTACK_RANGE_Y = 44;

type RunPhase = 'waiting' | 'running' | 'finished';

export class GameScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private player!: Player;
  private timer!: TimerSystem;
  private accumulator = 0;
  private hitstopMs   = 0;

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

  // Level identity (needed by ghost recorder)
  private levelId!: string;
  private levelVersion!: string;

  // ── Phase 5: visual state ────────────────────────────────────────────────────
  private cameraLookaheadX   = 0;
  private playerPrevAirborne = false;

  // ── Phase 6: ghost recording & playback ──────────────────────────────────────
  private recorder:    GhostRecorder | null = null;
  private ghostPlayer: GhostPlayer   | null = null;

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
    this.accumulator          = 0;
    this.hitstopMs            = 0;
    this.runPhase             = 'waiting';
    this.deaths               = 0;
    this.checkpointRespawns   = 0;
    this.activeCheckpointId   = 0;
    this.coinsCollected       = 0;
    this.enemies              = [];
    this.cameraLookaheadX     = 0;
    this.playerPrevAirborne   = false;
    this.recorder             = null;
    this.ghostPlayer          = null;

    // ── Textures ──────────────────────────────────────────────────────────────
    this.makeCanvasTex('player-tex',  24, 44, toHex(PALETTE.PLAYER));
    this.makeCanvasTex('enemy-tex',   28, 36, toHex(PALETTE.DANGER_RED));
    this.makeCanvasTex('pixel',        1,  1, '#ffffff');
    this.makeCanvasCircle('coin-tex',     16, toHex(PALETTE.COIN));
    this.makeCanvasCircle('powerup-tex',  20, toHex(PALETTE.POWERUP_VIOLET));

    // ── Physics world ─────────────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // ── Background + parallax ─────────────────────────────────────────────────
    // Base dark gradient fills the world behind everything (depth -20)
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG_TOP, PALETTE.BG_TOP, PALETTE.BG_BOTTOM, PALETTE.BG_BOTTOM, 1);
    bg.fillRect(0, 0, WORLD_W, WORLD_H);
    bg.setDepth(-20);

    // Three-layer parallax: stars (-19), horizon (-18), city (-17)
    buildParallax(this);

    // Dim world grid (behind platforms but in front of parallax)
    this.buildGrid();

    // ── Level ─────────────────────────────────────────────────────────────────
    const def   = LEVEL_REGISTRY[DEFAULT_LEVEL_ID];
    this.levelId      = def.meta.levelId;
    this.levelVersion = def.meta.version;
    const level = def.build(this);

    this.spawnX       = level.spawnX;
    this.spawnY       = level.spawnY;
    this.startLineX   = level.startLineX;
    this.finishLineX  = level.finishLineX;
    this.checkpoints  = level.checkpoints;
    this.activeSpawnX = this.spawnX;
    this.activeSpawnY = this.spawnY;

    this.enemies = level.enemies;

    // ── Player ────────────────────────────────────────────────────────────────
    this.player = new Player(this, this.spawnX, this.spawnY);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, level.platforms);

    // Selective glow on player (WebGL only — postFX is null in Canvas mode)
    this.player.postFX?.addGlow(PALETTE.PLAYER, 8, 0, false, 0.1, 20);

    // ── Collectible overlaps ───────────────────────────────────────────────────
    this.physics.add.overlap(
      this.player, level.coins,
      (_p, coin) => { this.onCoinCollect(coin as Phaser.Physics.Arcade.Image); },
    );
    this.physics.add.overlap(
      this.player, level.powerups,
      (_p, pu)   => { this.onPowerupCollect(pu as Phaser.Physics.Arcade.Image); },
    );

    // Glow on collectibles
    level.coins.getChildren().forEach(c => {
      (c as Phaser.Physics.Arcade.Image).postFX?.addGlow(PALETTE.COIN, 4, 0, false, 0.1, 10);
    });
    level.powerups.getChildren().forEach(p => {
      (p as Phaser.Physics.Arcade.Image).postFX?.addGlow(PALETTE.POWERUP_VIOLET, 5, 0, false, 0.1, 12);
    });

    // Pulsing finish-zone glow overlay
    const fGlow = this.add.rectangle(this.finishLineX + 80, WORLD_H - 24, 160, 48, PALETTE.FINISH_LIME, 0.12)
      .setDepth(3);
    this.tweens.add({
      targets: fGlow, alpha: 0.04, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    fGlow.postFX?.addGlow(PALETTE.FINISH_LIME, 10, 0, false, 0.1, 22);

    // ── Ghost player (load PB ghost from localStorage, async decode) ──────────
    const savedBlob = GhostManager.load(this.levelId);
    if (savedBlob) {
      GhostPlayer.fromBlob(this, savedBlob).then(gp => {
        this.ghostPlayer = gp;
      }).catch(() => {
        // Corrupt or incompatible blob — clear it so we don't error again
        GhostManager.clear(this.levelId);
      });
    }

    // ── Camera ────────────────────────────────────────────────────────────────
    // Viewport 550 px tall — bottom 170 px is the touch-button safe zone.
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

    // ── Ghost render (render-rate interpolation) ──────────────────────────────
    if (this.ghostPlayer && this.runPhase === 'running') {
      this.ghostPlayer.updateRender(this.timer.elapsed, this.player.x);
    } else if (this.ghostPlayer && this.runPhase !== 'running') {
      this.ghostPlayer.hide();
    }

    // ── Camera lookahead (render-rate — smooth interpolation) ─────────────────
    const targetLookahead = this.player.playerState !== 'idle' && this.player.playerState !== 'wall_slide'
      ? this.player.facing * 160 : 0;
    this.cameraLookaheadX += (targetLookahead - this.cameraLookaheadX) * 0.06;
    this.cameras.main.setFollowOffset(-Math.round(this.cameraLookaheadX), 0);

    // ── Hitstop: freeze frame on enemy kill ───────────────────────────────────
    if (this.hitstopMs > 0) {
      this.hitstopMs -= delta;
      return;
    }

    // ── Fixed-timestep accumulator ────────────────────────────────────────────
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

      // ── Phase 5: squash-and-stretch ────────────────────────────────────────
      const isAirborne = this.player.playerState === 'airborne';
      if (this.playerPrevAirborne && !isAirborne) {
        // Just landed
        this.tweens.killTweensOf(this.player);
        this.tweens.add({
          targets: this.player, scaleX: 1.4, scaleY: 0.65,
          duration: 60, yoyo: true, ease: 'Sine.easeOut',
        });
      }
      if (!this.playerPrevAirborne && isAirborne) {
        const vy = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y;
        if (vy < -100) { // jumped upward (not walked off ledge)
          this.tweens.killTweensOf(this.player);
          this.tweens.add({
            targets: this.player, scaleX: 0.72, scaleY: 1.35,
            duration: 80, yoyo: true, ease: 'Sine.easeOut',
          });
        }
      }
      this.playerPrevAirborne = isAirborne;

      // ── Phase 5: dash afterimages ──────────────────────────────────────────
      if (this.player.playerState === 'dash') {
        this.spawnDashGhost();
      }

      // ── Phase 6: record ghost frame ────────────────────────────────────────
      if (this.runPhase === 'running' && this.recorder) {
        this.recorder.record(this.player.x, this.player.y, this.player.facing);
      }

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

  // ── Combat ────────────────────────────────────────────────────────────────────

  private checkAttacks(): void {
    if (!this.player.isAttacking) return;

    const px = this.player.x;
    const py = this.player.y;
    const f  = this.player.facing;

    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = (e.x - px) * f;
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
      if (pb.right > eb.left && pb.left < eb.right &&
          pb.bottom > eb.top && pb.top < eb.bottom) {
        this.onDeath();
        return;
      }
    }
  }

  private killEnemy(e: Enemy): void {
    this.spawnBurst(e.x, e.y, 'pixel', PALETTE.DANGER_RED, 12, 5);
    e.destroy();
    this.hitstopMs = 80;
  }

  private onCoinCollect(coin: Phaser.Physics.Arcade.Image): void {
    this.spawnBurst(coin.x, coin.y, 'coin-tex', PALETTE.COIN, 8, 0.8);
    coin.destroy();
    this.coinsCollected++;
    this.coinText.setText(`COINS  ${this.coinsCollected}`);
  }

  private onPowerupCollect(pu: Phaser.Physics.Arcade.Image): void {
    this.spawnBurst(pu.x, pu.y, 'powerup-tex', PALETTE.POWERUP_VIOLET, 10, 1);
    pu.destroy();
    this.player.applySpeedBoost(5000);
  }

  // ── Run lifecycle ─────────────────────────────────────────────────────────────

  private startRun(): void {
    this.runPhase = 'running';
    this.timer.start();
    this.statusText.setVisible(false);
    this.recorder = new GhostRecorder(this.levelId, this.levelVersion);
  }

  private finishRun(): void {
    this.runPhase = 'finished';
    this.timer.stop();

    // Encode and save ghost if it's a new PB (async — happens in background)
    if (this.recorder) {
      const finalTimeMs = this.timer.elapsed;
      const rec = this.recorder;
      this.recorder = null;
      rec.encode().then(blob => {
        GhostManager.save(blob, finalTimeMs);
      });
    }

    if (this.ghostPlayer) this.ghostPlayer.hide();
    this.showFinishScreen();
  }

  private onDeath(): void {
    this.deaths++;

    // Screen shake + red flash
    this.cameras.main.shake(180, 0.012);
    this.spawnDeathFlash();

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
    this.player.startInvincible(1200);
  }

  private doRespawn(x: number, y: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(0, 0);
    // Reset any squash/stretch tween so the player respawns at normal scale
    this.tweens.killTweensOf(this.player);
    this.player.setScale(1, 1);
  }

  // ── Phase 5: effects ─────────────────────────────────────────────────────────

  private spawnDashGhost(): void {
    const g = this.add.image(this.player.x, this.player.y, 'player-tex');
    g.setAlpha(0.55)
     .setTint(PALETTE.PLAYER)
     .setDepth(4)
     .setFlipX(this.player.flipX)
     .setScale(this.player.scaleX, this.player.scaleY);
    this.tweens.add({
      targets: g, alpha: 0, scaleX: g.scaleX * 0.55,
      duration: 160, ease: 'Linear',
      onComplete: () => g.destroy(),
    });
  }

  private spawnBurst(x: number, y: number, tex: string, tint: number, count: number, scale: number): void {
    const em = this.add.particles(x, y, tex, {
      speed:   { min: 55, max: 210 },
      angle:   { min: 0, max: 360 },
      scale:   { start: scale, end: 0 },
      tint,
      lifespan: 380,
      emitting: false,
    }).setDepth(6);
    em.explode(count);
    this.time.delayedCall(460, () => { if (em?.active) em.destroy(); });
  }

  private spawnDeathFlash(): void {
    // Red overlay fills the camera viewport (scrollFactor 0)
    const flash = this.add.rectangle(640, 275, 1280, 550, PALETTE.DANGER_RED, 0.28)
      .setScrollFactor(0).setDepth(190);
    this.tweens.add({
      targets: flash, alpha: 0, duration: 250,
      ease: 'Quad.easeOut', onComplete: () => flash.destroy(),
    });
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

    // Finish overlay
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
    const coinSuffix  = this.coinsCollected > 0 ? `  ·  ${this.coinsCollected} coins` : '';
    // Show ghost comparison if one was loaded
    const ghostBlob   = GhostManager.load(this.levelId);
    const ghostSuffix = ghostBlob
      ? `\nGHOST  ${this.formatMs(GhostManager.ghostTimeMs(ghostBlob))}`
      : '';
    this.finishTimeLabel.setText(this.timer.format() + coinSuffix + ghostSuffix);
    this.finishBg.setVisible(true);
    this.finishTitle.setVisible(true);
    this.finishTimeLabel.setVisible(true);
    this.finishHint.setVisible(true);

    this.input.keyboard!.once('keydown', () => { this.scene.restart(); });
    this.input.once('pointerdown',       () => { this.scene.restart(); });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private formatMs(ms: number): string {
    const total = Math.floor(ms);
    const m  = Math.floor(total / 60_000);
    const s  = Math.floor((total % 60_000) / 1_000);
    const ms2 = total % 1_000;
    return `${m}:${s.toString().padStart(2, '0')}.${ms2.toString().padStart(3, '0')}`;
  }

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
    g.lineStyle(1, PALETTE.GRID_LINE, 0.18);
    const step = 80;
    for (let x = 0; x <= WORLD_W; x += step) g.lineBetween(x, 0, x, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += step) g.lineBetween(0, y, WORLD_W, y);
    // depth -15: above parallax layers (-17,-18,-19) but below platforms (0)
    g.setDepth(-15).setScrollFactor(0.4, 0.4);
  }
}
