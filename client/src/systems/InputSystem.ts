export interface InputSnapshot {
  left: boolean;
  right: boolean;
  down: boolean;
  jumpHeld: boolean;
  /** True for exactly one tick when jump key transitions down (event-based, not polled) */
  jumpPressed: boolean;
  /** True for exactly one tick when jump key transitions up */
  jumpReleased: boolean;
  /** True for exactly one tick when dash key transitions down */
  dashPressed: boolean;
}

export class InputSystem {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keyW: Phaser.Input.Keyboard.Key;
  private readonly keyA: Phaser.Input.Keyboard.Key;
  private readonly keyS: Phaser.Input.Keyboard.Key;
  private readonly keyD: Phaser.Input.Keyboard.Key;

  // Edge-triggered flags — set by keyboard events, consumed once per snapshot
  private _jumpPressed = false;
  private _jumpReleased = false;
  private _dashPressed = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey('W');
    this.keyA = kb.addKey('A');
    this.keyS = kb.addKey('S');
    this.keyD = kb.addKey('D');

    const onJumpDown = () => { this._jumpPressed = true; };
    const onJumpUp = () => { this._jumpReleased = true; };
    const onDashDown = () => { this._dashPressed = true; };

    for (const k of ['UP', 'W', 'Z', 'SPACE']) kb.on(`keydown-${k}`, onJumpDown);
    for (const k of ['UP', 'W', 'Z', 'SPACE']) kb.on(`keyup-${k}`, onJumpUp);
    for (const k of ['X', 'SHIFT']) kb.on(`keydown-${k}`, onDashDown);
  }

  /** Consume accumulated input events and current key states. Call once per fixed tick. */
  snapshot(): InputSnapshot {
    const jumpHeld =
      this.cursors.up.isDown ||
      this.keyW.isDown ||
      (this.cursors as unknown as Record<string, Phaser.Input.Keyboard.Key>).space?.isDown;

    const snap: InputSnapshot = {
      left: this.cursors.left.isDown || this.keyA.isDown,
      right: this.cursors.right.isDown || this.keyD.isDown,
      down: this.cursors.down.isDown || this.keyS.isDown,
      jumpHeld: jumpHeld ?? false,
      jumpPressed: this._jumpPressed,
      jumpReleased: this._jumpReleased,
      dashPressed: this._dashPressed,
    };

    this._jumpPressed = false;
    this._jumpReleased = false;
    this._dashPressed = false;

    return snap;
  }
}
