import Phaser from 'phaser';
import type { LevelMeta } from '@afterglow/shared';
import { LEVEL_REGISTRY } from '../levels/LevelRegistry';
import { PALETTE, toHex } from '../gfx/palette';

const CARD_W = 640;
const CARD_H = 92;
const CARD_X = 640; // center x

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG_TOP, PALETTE.BG_TOP, PALETTE.BG_BOTTOM, PALETTE.BG_BOTTOM, 1);
    bg.fillRect(0, 0, 1280, 720);

    // Subtle grid overlay
    const grid = this.add.graphics();
    grid.lineStyle(1, PALETTE.GRID_LINE, 0.14);
    for (let x = 0; x <= 1280; x += 80) grid.lineBetween(x, 0, x, 720);
    for (let y = 0; y <= 720; y += 80) grid.lineBetween(0, y, 1280, y);

    // Title glow bar
    const glowBar = this.add.graphics();
    glowBar.lineStyle(1, PALETTE.PLAYER, 0.2);
    glowBar.lineBetween(200, 190, 1080, 190);

    // Title
    const title = this.add.text(640, 108, 'AFTERGLOW', {
      fontSize: '74px',
      fontFamily: 'monospace',
      color: toHex(PALETTE.PLAYER),
    }).setOrigin(0.5);
    title.postFX?.addGlow(PALETTE.PLAYER, 3, 0, false, 0.05, 10);

    // Subtitle
    this.add.text(640, 182, 'S E L E C T   L E V E L', {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: toHex(PALETTE.PLATFORM_GLOW),
    }).setOrigin(0.5).setAlpha(0.7);

    // Level cards
    const levels = Object.values(LEVEL_REGISTRY).map(d => d.meta);
    const startY = 240;
    levels.forEach((meta, i) => {
      this.makeCard(meta, startY + i * (CARD_H + 28));
    });

    // Controls hint
    this.add.text(640, 690, '[Z] ATTACK    [X] DASH    [↑ / W / Space] JUMP', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: toHex(PALETTE.PLATFORM_GLOW),
    }).setOrigin(0.5).setAlpha(0.45);
  }

  private makeCard(meta: LevelMeta, cardTopY: number): void {
    const cy = cardTopY + CARD_H / 2;

    const bg = this.add.rectangle(CARD_X, cy, CARD_W, CARD_H, 0x0a0814, 1)
      .setStrokeStyle(1, 0x303060);

    const nameText = this.add.text(
      CARD_X - CARD_W / 2 + 28, cardTopY + 18,
      meta.name,
      { fontSize: '26px', fontFamily: 'monospace', color: '#ffffff' },
    );

    const parLabel = this.add.text(
      CARD_X - CARD_W / 2 + 28, cardTopY + 56,
      `PAR  ${this.formatMs(meta.parTimeMs)}`,
      { fontSize: '14px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW) },
    ).setAlpha(0.7);

    const arrow = this.add.text(
      CARD_X + CARD_W / 2 - 28, cy,
      '▶',
      { fontSize: '22px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW) },
    ).setOrigin(0.5);

    bg.setInteractive({ cursor: 'pointer' })
      .on('pointerover', () => {
        bg.setStrokeStyle(2, PALETTE.PLAYER);
        nameText.setColor(toHex(PALETTE.PLAYER));
        arrow.setColor(toHex(PALETTE.PLAYER));
        parLabel.setAlpha(1);
      })
      .on('pointerout', () => {
        bg.setStrokeStyle(1, 0x303060);
        nameText.setColor('#ffffff');
        arrow.setColor(toHex(PALETTE.PLATFORM_GLOW));
        parLabel.setAlpha(0.7);
      })
      .on('pointerdown', () => {
        this.scene.start('Game', { levelId: meta.levelId });
      });
  }

  private formatMs(ms: number): string {
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
