import Phaser from 'phaser';

export type PlatformerConfig = {
  meta: { title: string; genre: 'platformer'; theme: string; difficulty: string };
  player: {
    jumpVelocity: number;
    moveSpeed: number;
    doubleJump: boolean;
    hp: number;
    color: string;
    size: number;
  };
  world: {
    gravity: number;
    groundColor: string;
    skyColor: string;
    width: number;
  };
  platforms: Array<{ x: number; y: number; width: number; height: number; color: string }>;
  goal: { x: number; y: number; color: string };
};

const hex = (s: string) => parseInt(s.replace('0x', ''), 16);

export class PlatformerSDK {
  scene: Phaser.Scene;
  config: PlatformerConfig;
  player!: Phaser.Physics.Arcade.Sprite;
  staticGroup!: Phaser.Physics.Arcade.StaticGroup;
  goalSprite!: Phaser.Physics.Arcade.Sprite;
  hpText!: Phaser.GameObjects.Text;
  statusText!: Phaser.GameObjects.Text;

  hp = 0;
  isGameOver = false;
  isWin = false;
  jumpsLeft = 0;

  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keyA!: Phaser.Input.Keyboard.Key;
  keyD!: Phaser.Input.Keyboard.Key;
  keySpace!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, config: PlatformerConfig) {
    this.scene = scene;
    this.config = config;
  }

  setupWorld() {
    const w = this.config.world.width;
    const h = this.scene.scale.height;
    this.scene.cameras.main.setBackgroundColor(this.config.world.skyColor);
    this.scene.physics.world.setBounds(0, 0, w, h);
    this.staticGroup = this.scene.physics.add.staticGroup();

    // ground
    const groundTex = this.makeTex('ground', w, 40, hex(this.config.world.groundColor));
    const ground = this.scene.physics.add.staticImage(w / 2, h - 20, groundTex);
    this.staticGroup.add(ground);

    // platforms
    for (let i = 0; i < this.config.platforms.length; i++) {
      const p = this.config.platforms[i];
      const tex = this.makeTex(`plat_${i}`, p.width, p.height, hex(p.color));
      const img = this.scene.physics.add.staticImage(p.x + p.width / 2, p.y + p.height / 2, tex);
      this.staticGroup.add(img);
    }
  }

  setupPlayer() {
    const { player } = this.config;
    const tex = this.makeTex('p_player', player.size, player.size, hex(player.color));
    const sprite = this.scene.physics.add.sprite(60, this.scene.scale.height - 80, tex);
    sprite.setCollideWorldBounds(true);
    this.scene.physics.add.collider(sprite, this.staticGroup);
    this.player = sprite;
    this.hp = player.hp;

    const kb = this.scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keySpace.on('down', () => this.tryJump());
    this.cursors.up!.on('down', () => this.tryJump());
  }

  setupGoal() {
    const g = this.config.goal;
    const tex = this.makeTex('goal', 28, 40, hex(g.color));
    this.goalSprite = this.scene.physics.add.staticImage(g.x, g.y, tex) as unknown as Phaser.Physics.Arcade.Sprite;
    this.scene.physics.add.overlap(this.player, this.goalSprite, () => this.win(), undefined, this);
  }

  setupUI() {
    this.hpText = this.scene.add.text(12, 10, `HP: ${this.hp}`, { fontSize: '14px', color: '#fff' });
    this.statusText = this.scene.add.text(12, 28, '', { fontSize: '14px', color: '#fff' });
  }

  update(_time: number, _delta: number) {
    if (this.isGameOver || this.isWin) return;
    const left = this.cursors.left?.isDown || this.keyA.isDown;
    const right = this.cursors.right?.isDown || this.keyD.isDown;
    const speed = this.config.player.moveSpeed;
    if (left) this.player.setVelocityX(-speed);
    else if (right) this.player.setVelocityX(speed);
    else this.player.setVelocityX(0);
    if ((this.player.body as Phaser.Physics.Arcade.Body).blocked.down) {
      this.jumpsLeft = this.config.player.doubleJump ? 2 : 1;
    }
  }

  // ---- internals ----
  private tryJump() {
    if (this.isGameOver || this.isWin) return;
    if (this.jumpsLeft <= 0) return;
    this.player.setVelocityY(-this.config.player.jumpVelocity);
    this.jumpsLeft -= 1;
  }
  private win() {
    if (this.isWin) return;
    this.isWin = true;
    this.statusText.setText('YOU WIN');
    this.scene.physics.pause();
  }
  private makeTex(key: string, w: number, h: number, color: number): string {
    if (this.scene.textures.exists(key)) return key;
    const g = this.scene.add.graphics();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
    return key;
  }
}
