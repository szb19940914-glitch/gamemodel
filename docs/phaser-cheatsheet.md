# Phaser 3 Cheatsheet (for codegen reference)

Codegen should NOT call these directly — use `GameSDK` instead. This file exists
so the model can ground its mental model when extending the SDK itself.

- Scene: `class S extends Phaser.Scene { preload() {} create() {} update() {} }`
- Physics body: `scene.physics.add.sprite(x, y, key)` returns `Phaser.Physics.Arcade.Sprite`
- Ground (static): `scene.add.rectangle(...)` then `scene.physics.add.existing(rect, true)`
- Keyboard: `scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)`
- Timer: `scene.time.addEvent({ delay, loop, callback })`
- Text: `scene.add.text(x, y, str, { fontSize, color })`
- Generated rect texture: `Graphics → fillRect → generateTexture(key, w, h)`

Common gotchas:

- `body.allowGravity = false` for kinematic obstacles
- `setImmovable(true)` to prevent player pushing them
- `setCollideWorldBounds(true)` to keep player on screen
- `blocked.down` is the canonical "on ground" check
