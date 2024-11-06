import Phaser from "phaser";

class Game extends Phaser.Scene {
  constructor() {
    super({ key: "Game" });
  }

  preload() {
    try {
      this.load.image("starfield", "assets/starfield.png");
      this.load.image("ship", "assets/player.png");
      this.load.image("bullet", "assets/bullet.png");
      this.load.image("enemy-green", "assets/enemy-green.png");
      this.load.image("enemy-blue", "assets/enemy-blue.png");
      this.load.image("blueEnemyBullet", "assets/enemy-blue-bullet.png");
      this.load.spritesheet("explosion", "assets/explode.png", {
        frameWidth: 128,
        frameHeight: 128,
        endFrame: 15,
      });
      this.load.bitmapFont(
        "spacefont",
        "assets/spacefont/spacefont.png",
        "assets/spacefont/spacefont.xml"
      );
      this.load.image("boss", "assets/boss.png");
      this.load.image("deathRay", "assets/death-ray.png");
    } catch (error) {
      console.log(error);
    }
  }

  create() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Starfield background
    this.starfield = this.add
      .tileSprite(0, 0, screenWidth, screenHeight, "starfield")
      .setOrigin(0, 0);

    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 30,
    });

    // Player setup
    this.player = this.physics.add.sprite(
      screenWidth * 0.5,
      screenHeight * 0.9,
      "ship"
    );
    this.player.body.setSize(50, 30);
    this.player.score = 0;
    this.player.health = 1000;

    // Create a smaller hit area for the player
    this.playerHitArea = this.physics.add.sprite(
      screenWidth * 0.5,
      screenHeight * 0.9,
      null
    );
    this.playerHitArea.body.setSize(30, 30); // Smaller hit area
    this.playerHitArea.setAlpha(0); // Make it invisible
    this.playerHitArea.setOrigin(0.5); // Center the hit area

    // Health and score text with percentage-based positioning
    this.helloText = this.add.text(
      screenWidth * 0.05,
      screenHeight * 0.05,
      `Health: ${this.player.health}`,
      { fontSize: "24px", fill: "#ffffff" }
    );

    this.scoreText = this.add.text(
      screenWidth * 0.75,
      screenHeight * 0.05,
      `Score: ${this.player.score}`,
      { fontSize: "24px", fill: "#ffffff" }
    );

    this.enemyBullets = this.physics.add.group({
      defaultKey: "blueEnemyBullet",
      maxSize: 50,
    });
    this.configureBlueEnemyBullets();

    this.player.setInteractive();
    this.input.setDraggable(this.player);

    this.input.on("drag", (pointer, obj, dragX, dragY) => {
      obj.x = dragX;
      obj.y = dragY;
    });

    this.player.on("pointerdown", this.startShooting, this);
    this.input.on("pointerup", this.stopShooting, this);

    this.enemies = this.physics.add.group({
      defaultKey: "enemy-green",
      maxSize: 50,
      runChildUpdate: true,
    });

    this.time.addEvent({
      delay: 1000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.hitEnemy,
      null,
      this
    );

    this.physics.add.overlap(
      this.playerHitArea,
      this.enemies,
      this.playerHit,
      null,
      this
    );

    this.physics.add.overlap(
      this.playerHitArea,
      this.enemyBullets,
      this.playerHitByEnemyBullet,
      null,
      this
    );

    // Enable overlap for the player's hit area
    this.physics.add.overlap(
      this.bullets,
      this.playerHitArea,
      this.hitPlayer,
      null,
      this
    );
  }

  startShooting() {
    if (!this.shootingTimer) {
      this.shootingTimer = this.time.addEvent({
        delay: 300,
        callback: this.shootBullet,
        callbackScope: this,
        loop: true,
      });
    }
  }

  stopShooting() {
    if (this.shootingTimer) {
      this.shootingTimer.remove();
      this.shootingTimer = null;
    }
  }

  playerHitByEnemyBullet(playerHitArea, bullet) {
    bullet.setVisible(false).setActive(false);
    //bullet.setActive(false).setVisible(false);
    this.player.health -= 10;
    this.helloText.setText(`Health: ${this.player.health}`);

    if (this.player.health <= 0) {
      this.playerDeath();
    }
  }

  playerDeath() {
    this.player.setInteractive(false);
    this.physics.pause();

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Game Over overlay
    const gameOverOverlay = this.add.graphics();
    gameOverOverlay.fillStyle(0x000000, 0.7);
    gameOverOverlay.fillRect(0, 0, screenWidth, screenHeight);

    // Game Over text
    this.add
      .bitmapText(
        screenWidth * 0.5,
        screenHeight * 0.5,
        "spacefont",
        "GAME OVER",
        Math.floor(screenWidth * 0.05)
      )
      .setOrigin(0.5);

    // Restart the game on click
    this.input.once("pointerdown", () => {
      this.scene.restart();
    });
  }

  shootBullet() {
    const bullet = this.bullets.get(this.player.x, this.player.y - 20);
    if (bullet) {
      bullet.setActive(true).setVisible(true);
      bullet.body.velocity.y = -300;
    }
  }

  spawnEnemy() {
    const x = Phaser.Math.Between(
      window.innerWidth * 0.05,
      window.innerWidth * 0.95
    );
    const enemy = this.enemies.get(x, -50);

    if (!enemy) return;

    enemy.setActive(true).setVisible(true);
    enemy.body.setVelocityY(100);
    enemy.body.collideWorldBounds = false;
    if (enemy.y < window.innerHeight) {
      this.shootAtPlayer(enemy);
    }
  }

  shootAtPlayer(enemy) {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y);
    if (bullet) {
      const angle = Phaser.Math.Angle.Between(
        enemy.x,
        enemy.y,
        this.player.x,
        this.player.y
      );
      bullet.setCrop(90, 0, 90, 70);
      bullet.setScale(0.4);
      bullet.setActive(true).setVisible(true);
      bullet.body.velocity.x = Math.cos(angle) * 200;
      bullet.body.velocity.y = Math.sin(angle) * 200;
    }
  }

  configureBlueEnemyBullets() {
    this.enemyBullets.children.iterate((bullet) => {
      if (bullet) {
        bullet.setAlpha(0.9);
        bullet.body.setSize(20, 20);
        bullet.body.collideWorldBounds = true;
      }
    });
  }

  hitEnemy(bullet, enemy) {
    bullet.setActive(false).setVisible(false);
    enemy.setActive(false).setVisible(false);
    this.physics.world.disableBody(enemy.body);
    this.addExplosion(enemy.x, enemy.y);
    this.player.score += 20;
    this.scoreText.setText(`Score: ${this.player.score}`);
  }

  playerHit(playerHitArea, enemy) {
    enemy.setActive(false).setVisible(false);
    this.player.health -= 20;
    this.helloText.setText(`Health: ${this.player.health}`);
  }

  hitPlayer(bullet, playerHitArea) {
    bullet.setActive(false).setVisible(false);
    this.player.health -= 10;
    this.helloText.setText(`Health: ${this.player.health}`);

    if (this.player.health <= 0) {
      this.playerDeath();
    }
  }

  addExplosion(x, y) {
    const explosion = this.add.particles(x, y, "explosion", { lifespan: 200 });
    this.time.delayedCall(100, () => {
      explosion.stop();
      explosion.destroy();
    });
  }

  update() {
    this.starfield.tilePositionY -= 2;

    this.bullets.children.iterate((bullet) => {
      if (bullet.active && bullet.y < 0) {
        bullet.setActive(false).setVisible(false);
      }
    });

    this.enemies.children.iterate((enemy) => {
      if (enemy.active && enemy.y > window.innerHeight) {
        enemy.setActive(false).setVisible(false);
        this.physics.world.disableBody(enemy.body);
      }
    });
  }
}

export default Game;
