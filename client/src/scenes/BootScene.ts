import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    // No file assets in Phase 1 — textures are generated procedurally in each scene.
  }

  create(): void {
    this.scene.start('NeonTest');
  }
}
