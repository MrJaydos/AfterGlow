import Phaser from 'phaser';
import { FIXED_DT_MS, WORLD_W, WORLD_H, WORLD_GRAVITY } from '../constants';
import { InputSystem } from '../systems/InputSystem';
import { Player } from '../entities/Player';
import { buildTestLevel } from '../levels/TestLevel';
import { PALETTE } from '../gfx/palette';

export class GameScene extends Phaser.Scene {
  private input!: InputSystem;
  private player!: Player;
  private accumulator = 0;
  private spawnX = 80;
  private spawnY = 620;

  constructor() {
    super({ key: 'Game' });
  }

  preload(): void {
    // Generate the player texture procedurally — a 24×44 cyan rectangle
    const g = this.make.graphics({}, false);
    g.fillStyle(PALETTE.PLAYER, 1);
    g.fillRect(0, 0, 24, 44);
    g.generateTexture('player-tex', 24, 44);
    g.destroy();
  }

  create(): void {
    // World bounds
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // Neon background gradient via two large rects
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG_TOP, PALETTE.BG_TOP, PALETTE.BG_BOTTOM, PALETTE.BG_BOTTOM, 1);
    bg.fillRect(0, 0, WORLD_W, WORLD_H);
    bg.setDepth(-10);

    // Subtle grid lines (parallax layer)
    this.buildGrid();

    // Level geometry
    const level = buildTestLevel(this);
    this.spawnX = level.spawnX;
    this.spawnY = level.spawnY;

    // Player
    this.player = new Player(this, this.spawnX, this.spawnY);
    this.player.setDepth(5);
    this.physics.add.collider(this.player, level.platforms);

    // Camera — follow player, bounded to world
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    // Input
    this.input = new InputSystem(this);

    // Debug overlay (DEV only — removed via tree shaking in prod since import.meta.env.DEV)
    if (import.meta.env.DEV) {
      this.buildDebugHUD();
    }
  }

  update(_time: number, delta: number): void {
    // Fixed-timestep accumulator — game logic runs at exactly 60Hz regardless of framerate
    this.accumulator += delta;

    while (this.accumulator >= FIXED_DT_MS) {
      const snap = this.input.snapshot();
      this.player.fixedUpdate(FIXED_DT_MS, snap);
      this.accumulator -= FIXED_DT_MS;
    }

    // Respawn on fall-off (y past world bottom with a small margin)
    if (this.player.y > WORLD_H + 60) {
      this.respawn();
    }
  }

  private respawn(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(this.spawnX, this.spawnY);
    body.setVelocity(0, 0);
  }

  private buildGrid(): void {
    const g = this.add.graphics();
    g.lineStyle(1, PALETTE.GRID_LINE, 0.25);

    const step = 80;
    for (let x = 0; x <= WORLD_W; x += step) {
      g.lineBetween(x, 0, x, WORLD_H);
    }
    for (let y = 0; y <= WORLD_H; y += step) {
      g.lineBetween(0, y, WORLD_W, y);
    }
    g.setDepth(-9);
    // Scroll at half speed (cheap parallax)
    this.cameras.main.ignore(g);
    this.add.existing(g).setScrollFactor(0.4, 0.4);
  }

  private buildDebugHUD(): void {
    const style = { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace' };
    const txt   = this.add.text(10, 10, '', style).setScrollFactor(0).setDepth(100);

    this.events.on('postupdate', () => {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      txt.setText([
        `state : ${this.player.playerState}`,
        `vx    : ${body.velocity.x.toFixed(0)}`,
        `vy    : ${body.velocity.y.toFixed(0)}`,
        `x/y   : ${this.player.x.toFixed(0)} / ${this.player.y.toFixed(0)}`,
        `facing: ${this.player.facing}`,
      ]);
    });
  }
}
