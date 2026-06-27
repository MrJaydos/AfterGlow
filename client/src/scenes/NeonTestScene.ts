import Phaser from 'phaser';
import { PALETTE, toHex } from '../gfx/palette';

export class NeonTestScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NeonTest' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.generateTextures();
    this.drawBackground(W, H);
    this.drawSynthGrid(W, H);
    this.drawStars(W, H);
    this.drawWorldObjects(W, H);
    this.drawHUD(W, H);
    this.spawnParticles(W, H);
    void this.checkServerHealth(W, H);
  }

  // ── texture generation ────────────────────────────────────────────────────────

  private generateTextures(): void {
    const defs = [
      { key: 'spark-cyan', color: PALETTE.PLAYER, size: 8 },
      { key: 'spark-pink', color: PALETTE.UI_HOT_PINK, size: 5 },
    ] as const;

    for (const { key, color, size } of defs) {
      if (this.textures.exists(key)) continue;
      const g = this.make.graphics({}, false);
      g.fillStyle(color, 1);
      g.fillCircle(size / 2, size / 2, size / 2);
      g.generateTexture(key, size, size);
      g.destroy();
    }
  }

  // ── background layers ─────────────────────────────────────────────────────────

  private drawBackground(W: number, H: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG_TOP, PALETTE.BG_TOP, PALETTE.BG_BOTTOM, PALETTE.BG_BOTTOM, 1);
    bg.fillRect(0, 0, W, H);
  }

  private drawSynthGrid(W: number, H: number): void {
    const g = this.add.graphics();
    const horizonY = H * 0.62;
    const vpX = W / 2;

    // Horizontal lines — fade in toward the bottom
    const hCount = 10;
    for (let i = 0; i < hCount; i++) {
      const t = i / (hCount - 1);
      const y = horizonY + t * (H - horizonY);
      g.lineStyle(1, PALETTE.GRID_LINE, 0.07 + t * 0.38);
      g.lineBetween(0, y, W, y);
    }

    // Radial lines from vanishing point
    const vCount = 18;
    for (let i = 0; i <= vCount; i++) {
      const x = (i / vCount) * W;
      g.lineStyle(1, PALETTE.GRID_BRIGHT, 0.22);
      g.lineBetween(vpX, horizonY, x, H);
    }

    // Glowing horizon line
    g.lineStyle(2, PALETTE.HORIZON, 0.55);
    g.lineBetween(0, horizonY, W, horizonY);
  }

  private drawStars(W: number, H: number): void {
    const g = this.add.graphics();
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.58);
      const r = Phaser.Math.FloatBetween(0.5, 1.8);
      const a = Phaser.Math.FloatBetween(0.25, 0.85);
      g.fillStyle(PALETTE.STAR, a);
      g.fillCircle(x, y, r);
    }
  }

  // ── gameplay objects ──────────────────────────────────────────────────────────

  private drawWorldObjects(W: number, H: number): void {
    const groundY = H * 0.73;
    const px = W / 2;
    const py = groundY - 34;

    // Soft radial light under the player (drawn first, lowest depth)
    const playerLight = this.add.graphics();
    playerLight.fillStyle(PALETTE.PLAYER, 0.05);
    playerLight.fillCircle(0, 0, 110);
    playerLight.setPosition(px, py);

    // Platform
    const plat = this.add.rectangle(px, groundY, 520, 14, PALETTE.PLATFORM);
    plat.postFX.addGlow(PALETTE.PLATFORM_GLOW, 5, 0);

    // Player placeholder (glowing cyan rect)
    const player = this.add.rectangle(px, py, 28, 48, PALETTE.PLAYER);
    player.postFX.addGlow(PALETTE.PLAYER, 14, 2);

    // Bob tween
    this.tweens.add({
      targets: [player, playerLight],
      y: `-=8`,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── HUD / titles ──────────────────────────────────────────────────────────────

  private drawHUD(W: number, H: number): void {
    const title = this.add.text(W / 2, H * 0.27, 'AFTERGLOW', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '84px',
      color: toHex(PALETTE.PLAYER),
      stroke: '#001a22',
      strokeThickness: 4,
    }).setOrigin(0.5);
    title.postFX.addGlow(PALETTE.PLAYER, 22, 0, false, 0.1, 22);

    this.tweens.add({
      targets: title,
      alpha: 0.82,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, H * 0.395, '[ SPEEDRUN  ·  GHOST RACING  ·  NEON ]', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '15px',
      color: toHex(PALETTE.UI_HOT_PINK),
      stroke: '#1a0010',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(16, H - 16, 'PHASE 1 — SCAFFOLD  |  v0.1.0', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '11px',
      color: '#6060cc',
    }).setOrigin(0, 1);
  }

  // ── particles ─────────────────────────────────────────────────────────────────

  private spawnParticles(W: number, H: number): void {
    // Drifting ember ambience (pink, slow upward drift across whole scene)
    this.add.particles(W / 2, H * 0.8, 'spark-pink', {
      x: { min: -W / 2, max: W / 2 },
      y: { min: 0, max: H * 0.6 },
      lifespan: 4500,
      speed: { min: 6, max: 28 },
      angle: { min: 248, max: 292 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.55, end: 0 },
      quantity: 1,
      frequency: 220,
      blendMode: Phaser.BlendModes.ADD,
    });

    // Tight cyan sparks near the player area
    this.add.particles(W / 2, H * 0.67, 'spark-cyan', {
      x: { min: -160, max: 160 },
      y: 0,
      lifespan: 2200,
      speed: { min: 4, max: 18 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.35, end: 0 },
      quantity: 1,
      frequency: 380,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  // ── server health check ───────────────────────────────────────────────────────

  private async checkServerHealth(W: number, H: number): Promise<void> {
    try {
      const res = await fetch('/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { status: string };
      this.add.text(W - 16, H - 16, `SERVER: ${data.status.toUpperCase()}`, {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '11px',
        color: toHex(PALETTE.UI_ACID_GREEN),
      }).setOrigin(1, 1);
    } catch {
      this.add.text(W - 16, H - 16, 'SERVER: OFFLINE', {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '11px',
        color: toHex(PALETTE.DANGER_ORANGE),
      }).setOrigin(1, 1);
    }
  }
}
