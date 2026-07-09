import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { NeonTestScene } from './scenes/NeonTestScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { WORLD_GRAVITY } from './constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0a12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: WORLD_GRAVITY },
      // fixedStep + fps lock physics to 60Hz, matching the accumulator in GameScene
      fixedStep: true,
      fps: 60,
      debug: false,
    },
  },
  scene: [BootScene, NeonTestScene, MenuScene, GameScene],
};

new Phaser.Game(config);
