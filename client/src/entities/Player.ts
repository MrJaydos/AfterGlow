import Phaser from 'phaser';
import type { InputSnapshot } from '../systems/InputSystem';

// ── Movement tuning ────────────────────────────────────────────────────────────
const WALK_SPEED      = 210;   // px/s max horizontal
const ACCEL           = 1600;  // px/s² ground acceleration
const AIR_ACCEL       = 1100;  // px/s² air control
const FRICTION        = 2400;  // px/s² ground deceleration
const AIR_FRICTION    = 500;   // px/s² air deceleration (minimal)

const JUMP_VY         = -530;  // initial jump impulse (up = negative)
const JUMP_CUT_VY     = -160;  // vy cap when button released early
const DJ_VY           = -480;  // double-jump impulse
const COYOTE_MS       = 110;   // grace window after walking off a ledge
const JUMP_BUFFER_MS  = 110;   // accept jump input slightly before landing

const DASH_SPEED      = 580;   // px/s during dash
const DASH_DURATION   = 130;   // ms
const DASH_COOLDOWN   = 600;   // ms between dashes (refreshed on ground/wall)

const WALL_SLIDE_VY   = 80;    // max fall speed while wall-sliding
const WALL_JUMP_VX    = 270;   // horizontal kick off wall
const WALL_JUMP_VY    = -500;  // vertical kick off wall
const WALL_JUMP_LOCK  = 90;    // ms of capped horizontal control after wall jump

const MAX_FALL        = 680;   // px/s terminal velocity
const FAST_FALL_MUL   = 1.55;  // extra-gravity multiplier while falling

export type PlayerState = 'idle' | 'run' | 'airborne' | 'dash' | 'wall_slide';

export class Player extends Phaser.Physics.Arcade.Sprite {
  playerState: PlayerState = 'idle';
  facing: 1 | -1 = 1;

  private coyoteMs      = 0;
  private jumpBufferMs  = 0;
  private dashCooldownMs = 0;
  private dashActiveMs  = 0;
  private wallJumpLockMs = 0;
  private hasDoubleJump = true;
  private dashWasUsed   = false;
  private wallSide: -1 | 0 | 1 = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player-tex');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 44);
    body.setMaxVelocityY(MAX_FALL);
  }

  fixedUpdate(dt: number, input: InputSnapshot): void {
    const body     = this.body as Phaser.Physics.Arcade.Body;
    const worldGrav = (this.scene.physics.world as Phaser.Physics.Arcade.World).gravity.y;

    // ── Physics contact ────────────────────────────────────────────────────────
    const onGround    = body.blocked.down;
    const onWallLeft  = body.blocked.left  && !onGround;
    const onWallRight = body.blocked.right && !onGround;
    this.wallSide     = onWallLeft ? -1 : onWallRight ? 1 : 0;
    const onWall      = this.wallSide !== 0;

    // ── Timers ─────────────────────────────────────────────────────────────────
    this.coyoteMs       = onGround ? COYOTE_MS : Math.max(0, this.coyoteMs - dt);
    this.jumpBufferMs   = input.jumpPressed ? JUMP_BUFFER_MS : Math.max(0, this.jumpBufferMs - dt);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - dt);
    this.wallJumpLockMs = Math.max(0, this.wallJumpLockMs - dt);

    // Refresh double-jump on landing; refresh dash on ground or wall
    if (onGround) {
      this.hasDoubleJump = true;
    }
    if ((onGround || onWall) && this.dashWasUsed) {
      this.dashCooldownMs = 0;
      this.dashWasUsed    = false;
    }

    // ── Active dash ────────────────────────────────────────────────────────────
    if (this.playerState === 'dash') {
      this.dashActiveMs -= dt;
      if (this.dashActiveMs > 0) return; // still dashing — skip all other logic

      // Dash ended
      body.setAllowGravity(true);
      // Fall through to normal state logic
    }

    // ── Initiate dash ──────────────────────────────────────────────────────────
    if (input.dashPressed && this.dashCooldownMs <= 0) {
      const dir = (input.right ? 1 : input.left ? -1 : this.facing) as 1 | -1;
      body.setVelocityX(DASH_SPEED * dir);
      body.setVelocityY(0);
      body.setAllowGravity(false);
      this.facing        = dir;
      this.dashActiveMs  = DASH_DURATION;
      this.dashCooldownMs = DASH_COOLDOWN;
      this.dashWasUsed   = true;
      this.playerState   = 'dash';
      return;
    }

    // ── Wall jump (higher priority than regular jump) ──────────────────────────
    if (this.jumpBufferMs > 0 && onWall) {
      const dir = (-this.wallSide) as 1 | -1;
      body.setVelocityX(WALL_JUMP_VX * dir);
      body.setVelocityY(WALL_JUMP_VY);
      this.facing          = dir;
      this.coyoteMs        = 0;
      this.jumpBufferMs    = 0;
      this.wallJumpLockMs  = WALL_JUMP_LOCK;
    }
    // ── Regular jump (coyote window) ───────────────────────────────────────────
    else if (this.jumpBufferMs > 0 && this.coyoteMs > 0) {
      body.setVelocityY(JUMP_VY);
      this.coyoteMs     = 0;
      this.jumpBufferMs = 0;
    }
    // ── Double jump ────────────────────────────────────────────────────────────
    else if (this.jumpBufferMs > 0 && this.hasDoubleJump && !onGround && !onWall && this.coyoteMs <= 0) {
      body.setVelocityY(DJ_VY);
      this.hasDoubleJump = false;
      this.jumpBufferMs  = 0;
    }

    // ── Variable-height jump cut ───────────────────────────────────────────────
    if (input.jumpReleased && body.velocity.y < JUMP_CUT_VY) {
      body.setVelocityY(JUMP_CUT_VY);
    }

    // ── Horizontal movement ────────────────────────────────────────────────────
    const inputDir = input.right ? 1 : input.left ? -1 : 0;

    if (inputDir !== 0 && this.wallJumpLockMs <= 0) {
      this.facing = inputDir as 1 | -1;
      const accel = onGround ? ACCEL : AIR_ACCEL;
      body.setVelocityX(Phaser.Math.MoveTowards(body.velocity.x, inputDir * WALK_SPEED, accel * dt / 1000));
    } else {
      const decel = onGround ? FRICTION : AIR_FRICTION;
      body.setVelocityX(Phaser.Math.MoveTowards(body.velocity.x, 0, decel * dt / 1000));
    }

    // ── Gravity modification ───────────────────────────────────────────────────
    const wouldWallSlide = onWall && body.velocity.y > 0;

    if (wouldWallSlide) {
      // Nearly cancel world gravity while on wall
      body.setGravityY(-worldGrav * 0.88);
      body.setVelocityY(Math.min(body.velocity.y, WALL_SLIDE_VY));
    } else if (body.velocity.y > 0) {
      // Extra fall gravity — snappier arc
      body.setGravityY(worldGrav * (FAST_FALL_MUL - 1));
    } else {
      body.setGravityY(0);
    }

    // ── Derive state ───────────────────────────────────────────────────────────
    if (onGround) {
      body.setGravityY(0);
      this.playerState = Math.abs(body.velocity.x) > 5 ? 'run' : 'idle';
    } else if (wouldWallSlide) {
      this.playerState = 'wall_slide';
    } else {
      this.playerState = 'airborne';
    }
  }
}
