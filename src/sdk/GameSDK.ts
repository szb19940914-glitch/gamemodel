/**
 * GameSDK — the only API the AI codegen layer is allowed to use.
 * Keep this surface small, stable, and well-documented.
 * Whenever you need a new capability, add a method here, then update docs/sdk-api.md.
 */
import Phaser from 'phaser';

export type GameConfig = {
  meta: { title: string; genre: string; theme: string; difficulty: string };
  player: {
    speed: number;
    jumpVelocity: number;
    doubleJump: boolean;
    hp: number;
    color: string;
    size: number;
  };
  world: {
    gravity: number;
    scrollSpeed: number;
    groundColor: string;
    skyColor: string;
  };
  obstacles: Array<{
    type: string;
    spawnInterval: number;
    color: string;
    width: number;
    height: number;
  }>;
  scoring: { type: string; perPixel: number };
  experience?: {
    goalText?: string;
    instructionText?: string;
    successText?: string;
    failureText?: string;
    mood?: 'calm' | 'playful' | 'intense' | 'mysterious';
    reward?: 'score' | 'survival' | 'collection';
  };
};

const hex = (s: string) => parseInt(s.replace('0x', ''), 16);

export class GameSDK {
  scene: Phaser.Scene;
  config: GameConfig;
  player!: Phaser.Physics.Arcade.Sprite;
  ground!: Phaser.GameObjects.Rectangle;
  obstacles!: Phaser.Physics.Arcade.Group;
  scoreText!: Phaser.GameObjects.Text;
  hpText!: Phaser.GameObjects.Text;
  goalText?: Phaser.GameObjects.Text;
  instructionText?: Phaser.GameObjects.Text;

  score = 0;
  hp = 0;
  isGameOver = false;
  jumpsLeft = 0;
  spawnTimers: Phaser.Time.TimerEvent[] = [];

  constructor(scene: Phaser.Scene, config: GameConfig) {
    this.scene = scene;
    this.config = config;
  }

  setupWorld() {
    const { world } = this.config;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.scene.cameras.main.setBackgroundColor(world.skyColor);
    this.ground = this.scene.add.rectangle(w / 2, h - 20, w, 40, hex(world.groundColor));
    this.scene.physics.add.existing(this.ground, true);

    const mood = this.config.experience?.mood;
    if (mood === 'playful') this.addAmbientDots([0xffdd66, 0xff77aa, 0x66ddff]);
    if (mood === 'mysterious') this.addAmbientDots([0x6655aa, 0x99aaff, 0x333366]);
    if (mood === 'intense') this.addAmbientDots([0xff5522, 0xffaa00, 0xffffff]);
  }

  setupPlayer() {
    const { player } = this.config;
    const tex = this.makeRectTexture('player', player.size, player.size, hex(player.color));
    const sprite = this.scene.physics.add.sprite(120, 200, tex);
    sprite.setCollideWorldBounds(true);
    this.scene.physics.add.collider(sprite, this.ground);
    this.player = sprite;
    this.hp = player.hp;

    const space = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space.on('down', () => this.tryJump());
    this.scene.input.on('pointerdown', () => this.tryJump());
  }

  setupObstacles() {
    this.obstacles = this.scene.physics.add.group();
    for (const ob of this.config.obstacles) {
      const tex = this.makeRectTexture(`ob_${ob.type}`, ob.width, ob.height, hex(ob.color));
      const t = this.scene.time.addEvent({
        delay: ob.spawnInterval * 1000,
        loop: true,
        callback: () => this.spawnObstacle(tex, ob.width, ob.height),
      });
      this.spawnTimers.push(t);
    }
    this.scene.physics.add.overlap(this.player, this.obstacles, () => this.takeHit(), undefined, this);
  }

  setupScoring() {
    const exp = this.config.experience;
    this.scoreText = this.scene.add.text(12, 10, 'Score: 0', { fontSize: '18px', color: '#fff' });
    this.hpText = this.scene.add.text(12, 32, `HP: ${this.hp}`, { fontSize: '14px', color: '#fff' });
    if (exp?.goalText) {
      this.goalText = this.scene.add.text(this.scene.scale.width / 2, 12, exp.goalText, {
        fontSize: '16px',
        color: '#fff',
        align: 'center',
      }).setOrigin(0.5, 0);
    }
    if (exp?.instructionText) {
      this.instructionText = this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height - 66, exp.instructionText, {
        fontSize: '14px',
        color: '#fff',
        align: 'center',
      }).setOrigin(0.5);
      this.scene.time.delayedCall(3000, () => this.instructionText?.destroy());
    }
  }

  update(_time: number, deltaMs: number) {
    if (this.isGameOver) return;
    const dt = deltaMs / 1000;
    if (this.config.scoring.type === 'distance') {
      this.score += this.config.world.scrollSpeed * dt * this.config.scoring.perPixel;
      this.scoreText.setText(`Score: ${Math.floor(this.score)}`);
    }
    this.obstacles.children.each((c) => {
      const ob = c as Phaser.Physics.Arcade.Sprite;
      ob.x -= this.config.world.scrollSpeed * dt;
      if (ob.x < -50) ob.destroy();
      return true;
    });
    if (this.player.body!.blocked.down) this.jumpsLeft = this.config.player.doubleJump ? 2 : 1;
  }

  // ---- internals ----

  private tryJump() {
    if (this.isGameOver) return;
    if (this.jumpsLeft <= 0) return;
    this.player.setVelocityY(-this.config.player.jumpVelocity);
    this.jumpsLeft -= 1;
  }

  private spawnObstacle(textureKey: string, w: number, _h: number) {
    if (this.isGameOver) return;
    const x = this.scene.scale.width + 40;
    const y = this.scene.scale.height - 40 - 20;
    const o = this.obstacles.create(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;
    o.setImmovable(true);
    (o.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    o.setSize(w, _h);
  }

  private takeHit() {
    if (this.isGameOver) return;
    this.hp -= 1;
    this.hpText.setText(`HP: ${this.hp}`);
    if (this.hp <= 0) this.gameOver();
  }

  private gameOver() {
    this.isGameOver = true;
    this.spawnTimers.forEach((t) => t.remove());
    this.scene.physics.pause();
    this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2, this.config.experience?.failureText || 'GAME OVER', {
        fontSize: '32px',
        color: '#fff',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private addAmbientDots(colors: number[]) {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    for (let i = 0; i < 18; i++) {
      const dot = this.scene.add.circle((i * 47) % w, 45 + ((i * 31) % Math.max(1, h - 130)), 2 + (i % 3), colors[i % colors.length], 0.35);
      dot.setScrollFactor(0);
    }
  }

  private makeRectTexture(key: string, w: number, h: number, color: number): string {
    if (this.scene.textures.exists(key)) return key;
    const g = this.scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
    return key;
  }
}
