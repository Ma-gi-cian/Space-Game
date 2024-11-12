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

    this.starfield = this.add
      .tileSprite(0, 0, screenWidth, screenHeight, "starfield")
      .setOrigin(0, 0);

    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 100,
    });

    this.player = this.physics.add.sprite(
      screenWidth * 0.5,
      screenHeight * 0.9,
      "ship"
    );
    this.player.body.setSize(50, 30);
    this.player.score = 0;
    this.player.health = 1000;

    this.playerHitArea = this.physics.add.sprite(
      screenWidth * 0.5,
      screenHeight * 0.9,
      null
    );
    this.playerHitArea.body.setSize(30, 30);
    this.playerHitArea.setAlpha(0);
    this.playerHitArea.setOrigin(0.5);

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

    this.timerText = this.add.text(
      screenWidth * 0.5,
      screenHeight * 0.05,
      "Time: 30",
      { fontSize: "24px", fill: "#ffffff" }
    ).setOrigin(0.5);

    this.timeRemaining = 30;
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
  }

  updateTimer() {
    this.timeRemaining--;
    this.timerText.setText(`Time: ${this.timeRemaining}`);

    if (this.timeRemaining <= 0) {
      this.endGame();
    }
  }

  startShooting() {
    if (!this.shootingTimer) {
      console.log("Start Shooting")
      this.shootingTimer = this.time.addEvent({
        delay: 300,
        callback: this.shootBullet,
        callbackScope: this,
        loop: true,
      });
    }
  }

  stopShooting() {
    console.log("Stopped shooting")
    if (this.shootingTimer) {
      this.shootingTimer.remove();
      this.shootingTimer = null;
    }
  }

  endGame() {
    this.physics.pause();

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const gameOverOverlay = this.add.graphics();
    gameOverOverlay.fillStyle(0x000000, 0.7);
    gameOverOverlay.fillRect(0, 0, screenWidth, screenHeight);

    this.add
      .bitmapText(
        screenWidth * 0.5,
        screenHeight * 0.4,
        "spacefont",
        `GAME OVER\nFinal Score: ${this.player.score}`,
        Math.floor(screenWidth * 0.05)
      )
      .setOrigin(0.5);

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
    const x = Phaser.Math.Between(window.innerWidth * 0.05, window.innerWidth * 0.95);
    const enemy = this.enemies.get(x, -50);

    if (!enemy) return;

    enemy.setActive(true).setVisible(true);
    enemy.body.setVelocityY(100);
    enemy.body.collideWorldBounds = false;
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

  addExplosion(x, y) {
    const explosion = this.add.particles(x, y, "explosion", { lifespan: 200 });
    this.time.delayedCall(200, () => {
      explosion.stop();
      explosion.destroy();
    });
  }

  update() {
    this.starfield.tilePositionY -= 2;

    this.bullets.children.iterate((bullet) => {
      if (bullet.active && this.physics.overlap(bullet, this.playerHitArea)) {
        bullet.setActive(false).setVisible(false);
        bullet.body.enable = false;
        this.player.health -= 10;
        this.helloText.setText(`Health: ${this.player.health}`);

        if (this.player.health <= 0) {
          this.playerDeath();
        }
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
