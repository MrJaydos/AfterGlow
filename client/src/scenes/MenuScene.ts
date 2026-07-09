import Phaser from 'phaser';
import type { DeathMode, LevelMeta } from '@afterglow/shared';
import { LEVEL_REGISTRY } from '../levels/LevelRegistry';
import { PALETTE, toHex } from '../gfx/palette';
import { SettingsOverlay } from '../ui/SettingsOverlay';

const CARD_W = 620;
const CARD_H = 88;
const CARD_X = 640;

const DEATH_MODE_KEY = 'ag_death_mode';

export class MenuScene extends Phaser.Scene {
  private deathMode: DeathMode = 'reset';
  private settingsOverlay: SettingsOverlay | null = null;

  // Phaser objects for the toggle buttons so we can repaint them
  private resetBtn!:      Phaser.GameObjects.Rectangle;
  private checkpointBtn!: Phaser.GameObjects.Rectangle;
  private resetLabel!:    Phaser.GameObjects.Text;
  private checkpointLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    this.deathMode = (localStorage.getItem(DEATH_MODE_KEY) as DeathMode | null) ?? 'reset';

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.BG_TOP, PALETTE.BG_TOP, PALETTE.BG_BOTTOM, PALETTE.BG_BOTTOM, 1);
    bg.fillRect(0, 0, 1280, 720);

    // Subtle grid
    const grid = this.add.graphics();
    grid.lineStyle(1, PALETTE.GRID_LINE, 0.14);
    for (let x = 0; x <= 1280; x += 80) grid.lineBetween(x, 0, x, 720);
    for (let y = 0; y <= 720; y += 80) grid.lineBetween(0, y, 1280, y);

    // Divider below title
    this.add.graphics()
      .lineStyle(1, PALETTE.PLAYER, 0.18)
      .lineBetween(240, 186, 1040, 186);

    // Title
    const title = this.add.text(640, 100, 'AFTERGLOW', {
      fontSize: '74px', fontFamily: 'monospace', color: toHex(PALETTE.PLAYER),
    }).setOrigin(0.5);
    title.postFX?.addGlow(PALETTE.PLAYER, 3, 0, false, 0.05, 10);

    // Subtitle
    this.add.text(640, 172, 'S E L E C T   L E V E L', {
      fontSize: '15px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setOrigin(0.5).setAlpha(0.7);

    // Death mode toggle
    this.buildDeathModeToggle(226);

    // Level cards (start below the toggle row)
    const levels = Object.values(LEVEL_REGISTRY).map(d => d.meta);
    const firstCardY = 292;
    levels.forEach((meta, i) => {
      this.makeCard(meta, firstCardY + i * (CARD_H + 16));
    });

    // Settings button — top-right corner
    const settingsBtn = this.add.text(1258, 16, '⚙', {
      fontSize: '22px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setOrigin(1, 0).setAlpha(0.6).setInteractive({ cursor: 'pointer' });
    settingsBtn.on('pointerover', () => settingsBtn.setAlpha(1).setColor(toHex(PALETTE.PLAYER)));
    settingsBtn.on('pointerout',  () => settingsBtn.setAlpha(0.6).setColor(toHex(PALETTE.PLATFORM_GLOW)));
    settingsBtn.on('pointerdown', () => this.openSettings());

    // Controls hint
    this.add.text(640, 692, '[Z] ATTACK    [X] DASH    [↑ / W / Space] JUMP', {
      fontSize: '12px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setOrigin(0.5).setAlpha(0.4);
  }

  // ── Death mode toggle ─────────────────────────────────────────────────────────

  private buildDeathModeToggle(y: number): void {
    this.add.text(CARD_X - CARD_W / 2, y + 14, 'DEATH MODE', {
      fontSize: '12px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW),
    }).setAlpha(0.6);

    const btnW = 130, btnH = 28, gap = 8;
    const rightEdge = CARD_X + CARD_W / 2;

    // CHECKPOINT button
    this.checkpointBtn = this.add.rectangle(rightEdge - btnW / 2, y + 14, btnW, btnH)
      .setStrokeStyle(1, 0x303060);
    this.checkpointLabel = this.add.text(rightEdge, y + 14, 'CHECKPOINT', {
      fontSize: '11px', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    // RESET button
    this.resetBtn = this.add.rectangle(rightEdge - btnW - gap - btnW / 2, y + 14, btnW, btnH)
      .setStrokeStyle(1, 0x303060);
    this.resetLabel = this.add.text(rightEdge - btnW - gap, y + 14, 'RESET', {
      fontSize: '11px', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    this.paintToggle();

    this.resetBtn.setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.setDeathMode('reset'));
    this.checkpointBtn.setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.setDeathMode('checkpoint'));
  }

  private setDeathMode(mode: DeathMode): void {
    this.deathMode = mode;
    localStorage.setItem(DEATH_MODE_KEY, mode);
    this.paintToggle();
  }

  private paintToggle(): void {
    const active   = 0x6060cc;
    const inactive = 0x1a1a30;
    const isReset  = this.deathMode === 'reset';

    this.resetBtn.setFillStyle(isReset ? active : inactive);
    this.resetLabel.setColor(isReset ? '#ffffff' : '#404060');

    this.checkpointBtn.setFillStyle(!isReset ? active : inactive);
    this.checkpointLabel.setColor(!isReset ? '#ffffff' : '#404060');
  }

  // ── Level cards ───────────────────────────────────────────────────────────────

  private makeCard(meta: LevelMeta, cardTopY: number): void {
    const cy = cardTopY + CARD_H / 2;

    const bg = this.add.rectangle(CARD_X, cy, CARD_W, CARD_H, 0x0a0814, 1)
      .setStrokeStyle(1, 0x303060);

    const nameText = this.add.text(
      CARD_X - CARD_W / 2 + 28, cardTopY + 16,
      meta.name,
      { fontSize: '26px', fontFamily: 'monospace', color: '#ffffff' },
    );

    const parText = this.add.text(
      CARD_X - CARD_W / 2 + 28, cardTopY + 52,
      `PAR  ${this.fmtMs(meta.parTimeMs)}`,
      { fontSize: '13px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW) },
    ).setAlpha(0.7);

    const arrow = this.add.text(
      CARD_X + CARD_W / 2 - 26, cy, '▶',
      { fontSize: '20px', fontFamily: 'monospace', color: toHex(PALETTE.PLATFORM_GLOW) },
    ).setOrigin(0.5);

    bg.setInteractive({ cursor: 'pointer' })
      .on('pointerover', () => {
        bg.setStrokeStyle(2, PALETTE.PLAYER);
        nameText.setColor(toHex(PALETTE.PLAYER));
        arrow.setColor(toHex(PALETTE.PLAYER));
        parText.setAlpha(1);
      })
      .on('pointerout', () => {
        bg.setStrokeStyle(1, 0x303060);
        nameText.setColor('#ffffff');
        arrow.setColor(toHex(PALETTE.PLATFORM_GLOW));
        parText.setAlpha(0.7);
      })
      .on('pointerdown', () => {
        this.scene.start('Game', { levelId: meta.levelId, deathMode: this.deathMode });
      });
  }

  // ── Settings ──────────────────────────────────────────────────────────────────

  private openSettings(): void {
    if (this.settingsOverlay) return;
    this.settingsOverlay = new SettingsOverlay(() => {
      this.settingsOverlay = null;
    });
  }

  private fmtMs(ms: number): string {
    const m = Math.floor(ms / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
