import Phaser from 'phaser';
import { PALETTE } from '../gfx/palette';
import { Enemy } from './Enemy';

const PATROL_SPEED = 85;   // px/s — slightly slower than regular enemy patrol
const RUSH_SPEED   = 310;  // px/s — charge speed when triggered
const DETECT_RANGE = 290;  // px  — horizontal detection radius
const RUSH_MS      = 520;  // ms  — how long a single rush lasts
const COOLDOWN_MS  = 950;  // ms  — pause before re-detecting after a rush

type RusherState = 'patrol' | 'rush' | 'cooldown';

/**
 * An enemy that patrols slowly, then charges at the player when they
 * enter its detection range. Orange-tinted to read as "dangerous but
 * distinct" from the regular red patrollers.
 */
export class Rusher extends Enemy {
  private rusherState: RusherState = 'patrol';
  private rushDir: 1 | -1 = 1;
  private stateMs = 0;
  private playerRef: Phaser.GameObjects.Sprite | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    patrolLeft: number, patrolRight: number,
  ) {
    super(scene, x, y, patrolLeft, patrolRight);
    this.setTint(PALETTE.DANGER_ORANGE);
  }

  setPlayer(player: Phaser.GameObjects.Sprite): void {
    this.playerRef = player;
  }

  override respawn(x: number, y: number): void {
    this.rusherState = 'patrol';
    this.stateMs     = 0;
    super.respawn(x, y);
  }

  override fixedUpdate(dt: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(0);

    switch (this.rusherState) {
      case 'patrol': {
        const px = this.playerRef?.x ?? null;
        if (px !== null && Math.abs(px - this.x) < DETECT_RANGE) {
          this.rushDir   = px > this.x ? 1 : -1;
          this.rusherState = 'rush';
          this.stateMs   = RUSH_MS;
          break;
        }
        if (this.x <= this.patrolLeft  || body.blocked.left)  this.direction = 1;
        if (this.x >= this.patrolRight || body.blocked.right) this.direction = -1;
        body.setVelocityX(PATROL_SPEED * this.direction);
        this.setFlipX(this.direction < 0);
        break;
      }

      case 'rush': {
        this.stateMs -= dt;
        body.setVelocityX(RUSH_SPEED * this.rushDir);
        this.setFlipX(this.rushDir < 0);
        if (this.stateMs <= 0) {
          this.rusherState = 'cooldown';
          this.stateMs     = COOLDOWN_MS;
        }
        break;
      }

      case 'cooldown': {
        this.stateMs -= dt;
        // Drift back toward patrol center
        const center = (this.patrolLeft + this.patrolRight) / 2;
        const dir: 1 | -1 = this.x < center ? 1 : -1;
        body.setVelocityX(PATROL_SPEED * dir);
        this.setFlipX(dir < 0);
        if (this.stateMs <= 0) this.rusherState = 'patrol';
        break;
      }
    }
  }
}
