import Phaser from 'phaser';
import { WORLD_GRAVITY } from '../constants';

const SPEED = 110; // px/s

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly patrolLeft:  number;
  readonly patrolRight: number;
  direction: 1 | -1 = 1;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    patrolLeft: number, patrolRight: number,
  ) {
    super(scene, x, y, 'enemy-tex');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.patrolLeft  = patrolLeft;
    this.patrolRight = patrolRight;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 36);
    body.setAllowGravity(false);
    // Cancel world gravity explicitly — belt-and-suspenders in case
    // a physics group or scene restart re-enables allowGravity.
    body.setGravityY(-WORLD_GRAVITY);
    body.setImmovable(true);
  }

  fixedUpdate(_dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.x <= this.patrolLeft  || body.blocked.left)  this.direction = 1;
    if (this.x >= this.patrolRight || body.blocked.right) this.direction = -1;

    body.setVelocityX(SPEED * this.direction);
    body.setVelocityY(0); // hard-lock vertical — no drift regardless of gravity state
    this.setFlipX(this.direction < 0);
  }
}
