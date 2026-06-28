import Phaser from 'phaser';

const DEPTH = 50;
const ALPHA_BG   = 0.14;
const ALPHA_LINE = 0.40;
const ALPHA_ICON = 0.70;

export class TouchControls {
  readonly available: boolean;

  left     = false;
  right    = false;
  jumpHeld = false;

  private _jumpPressed  = false;
  private _jumpReleased = false;
  private _dashPressed  = false;

  constructor(scene: Phaser.Scene) {
    this.available = scene.sys.game.device.input.touch;
    if (!this.available) return;

    // Allow up to 4 simultaneous touches (left + right + jump + dash)
    scene.input.addPointer(3);

    const W   = scene.scale.width;
    const H   = scene.scale.height;
    const R   = 54;
    const PAD = 22;
    const Y   = H - PAD - R;
    const GAP = 12;

    // Left cluster
    this.btn(scene, PAD + R,             Y, R, '◀',
      () => { this.left = true; },
      () => { this.left = false; });

    this.btn(scene, PAD + R * 2 + GAP + R, Y, R, '▶',
      () => { this.right = true; },
      () => { this.right = false; });

    // Right cluster — jump is the big action button
    this.btn(scene, W - PAD - R,                   Y, R, '▲',
      () => { this._jumpPressed = true; this.jumpHeld = true; },
      () => { this._jumpReleased = true; this.jumpHeld = false; });

    this.btn(scene, W - PAD - R * 2 - GAP - R,    Y, R, '⚡',
      () => { this._dashPressed = true; },
      () => { /* dash is edge-only */ });
  }

  consumeEdges(): { jumpPressed: boolean; jumpReleased: boolean; dashPressed: boolean } {
    const out = {
      jumpPressed:  this._jumpPressed,
      jumpReleased: this._jumpReleased,
      dashPressed:  this._dashPressed,
    };
    this._jumpPressed  = false;
    this._jumpReleased = false;
    this._dashPressed  = false;
    return out;
  }

  private btn(
    scene: Phaser.Scene,
    x: number, y: number, r: number, label: string,
    onDown: () => void, onUp: () => void,
  ): void {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, ALPHA_BG);
    g.lineStyle(2, 0xffffff, ALPHA_LINE);
    g.fillCircle(x, y, r);
    g.strokeCircle(x, y, r);
    g.setScrollFactor(0).setDepth(DEPTH);

    scene.add.text(x, y, label, {
      fontSize: '24px',
      fontFamily: 'system-ui, sans-serif',
      color: '#ffffff',
    })
      .setOrigin(0.5, 0.5)
      .setAlpha(ALPHA_ICON)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    // Interactive zone — slightly larger than visual for better thumb ergonomics
    const zone = scene.add.zone(x, y, r * 2.4, r * 2.4)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2)
      .setInteractive();

    zone.on(Phaser.Input.Events.POINTER_DOWN, onDown);
    zone.on(Phaser.Input.Events.POINTER_UP, onUp);
    zone.on(Phaser.Input.Events.POINTER_OUT, onUp);
  }
}
