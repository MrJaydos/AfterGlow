import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { NeonTestScene } from './scenes/NeonTestScene';

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
  scene: [BootScene, NeonTestScene],
};

new Phaser.Game(config);
