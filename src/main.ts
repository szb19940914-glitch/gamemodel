import Phaser from 'phaser';
import config from './config.json';
import { GameSDK, GameConfig } from './sdk/GameSDK';
import { PlatformerSDK, PlatformerConfig } from './sdk/PlatformerSDK';

type AnyConfig = { meta: { genre: 'runner' | 'platformer' } } & Record<string, unknown>;

const cfg = config as unknown as AnyConfig;
const genre = cfg.meta.genre;

class RunnerScene extends Phaser.Scene {
  sdk!: GameSDK;
  create() {
    this.sdk = new GameSDK(this, config as unknown as GameConfig);
    this.sdk.setupWorld();
    this.sdk.setupPlayer();
    this.sdk.setupObstacles();
    this.sdk.setupScoring();
    (window as unknown as { __GAME__: GameSDK & { genre: string } }).__GAME__ = Object.assign(this.sdk, { genre: 'runner' });
  }
  update(t: number, d: number) { this.sdk.update(t, d); }
}

class PlatformerScene extends Phaser.Scene {
  sdk!: PlatformerSDK;
  create() {
    this.sdk = new PlatformerSDK(this, config as unknown as PlatformerConfig);
    this.sdk.setupWorld();
    this.sdk.setupPlayer();
    this.sdk.setupGoal();
    this.sdk.setupUI();
    (window as unknown as { __GAME__: PlatformerSDK & { genre: string } }).__GAME__ = Object.assign(this.sdk, { genre: 'platformer' });
  }
  update(t: number, d: number) { this.sdk.update(t, d); }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 400,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: (cfg as unknown as { world: { gravity: number } }).world.gravity },
      debug: false,
    },
  },
  scene: genre === 'platformer' ? PlatformerScene : RunnerScene,
});
