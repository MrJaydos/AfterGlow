import type { LevelMeta } from '@afterglow/shared';
import type { Enemy } from '../entities/Enemy';

export interface Checkpoint {
  id: number;
  triggerX: number;   // player.x >= triggerX → this checkpoint becomes active
  spawnX: number;
  spawnY: number;
}

export interface BuiltLevel {
  platforms:  Phaser.Physics.Arcade.StaticGroup;
  spawnX: number;
  spawnY: number;
  startLineX: number;
  finishLineX: number;
  checkpoints: Checkpoint[];
  coins:      Phaser.Physics.Arcade.StaticGroup;
  enemies:    Enemy[];
  powerups:   Phaser.Physics.Arcade.StaticGroup;
}

export interface LevelDef {
  meta: LevelMeta;
  build: (scene: Phaser.Scene) => BuiltLevel;
}
