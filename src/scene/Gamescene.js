const MAXSPEED = 400;
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    console.log("Inside game constructor.");
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
    this.starfield = this.add
      .tileSprite(0, 0, 800, 600, "starfield")
      .setOrigin(0, 0);

    this.bullets = this.physics.add.group({
      defaultKey: "bullet",
      maxSize: 30,
    });

    for (let i = 0; i < 30; i++) {
      let bullet = this.bullets.create(0, 0, "bullet");
      bullet.setActive(false).setVisible(false);
      bullet.body.setCollideWorldBounds(true);
      bullet.body.onWorldBounds = true;
    }

    this.player = this.physics.add.sprite(400, 500, "ship");
    this.player.health = 100;
    this.player.setOrigin(0.5, 0.5);
    this.player.setMaxVelocity(400, 400);
    this.player.setDrag(10, 10);
    this.player.weaponLevel = -1;

    // this.player.on("killed", () => {
    //   this.shipTrail.stop();
    // });

    // this.player.on('revived', () => {
    //   shipTrail.start(false, 5000, 10);  // Restart the trail with parameters
    // });

    this.greenEnemies = this.physics.add.group({
      key: "enemy-green",
      repeat: 4,
      setXY: { x: 100, y: 100, stepX: 100 },
    });

    this.greenEnemies.children.iterate((enemy) => {
      enemy.setScale(0.5);
      enemy.setAngle(180);
      enemy.body.setSize(enemy.width * 0.75, enemy.height * 0.75);
      enemy.damageAmount = 20;

      enemy.on("killed", () => {
        enemy.trail.stop();
      });
    });

    this.time.addEvent({
      delay: 1000,
      callback: this.launchGreenEnemy,
      callbackScope: this,
      loop: false,
    });

    console.log(this.launchGreenEnemy);

    this.blueEnemyBullets = this.physics.add.group({
      maxSize: 30,
      defaultKey: "blueEnemyBullet",
    });

    this.blueEnemyBullets.children.iterate((bullet) => {
      bullet.setCrop(90, 0, 90, 70); // Equivalent of crop in Phaser 2
      bullet.setAlpha(0.9); // Set transparency
      bullet.setOrigin(0.5); // Center the anchor point
      bullet.body.setSize(20, 20); // Adjust hitbox size

      bullet.body.collideWorldBounds = true; // Enable world bounds collision
      bullet.body.onWorldBounds = true; // Kill bullet when out of bounds
    });

    this.bossContainer = this.add.container(0, 0);
    this.boss = this.physics.add.sprite(0, 0, "boss");
    this.bossContainer.add(this.boss);
    this.boss.setOrigin(0.5, 0.5);
    this.boss.setScale(0.6);
    this.boss.angle = 180;
    this.boss.setMaxVelocity(100, 80);
    this.boss.exists = false;
    this.boss.alive = false;
    this.boss.damageAmount = 50;
    this.boss.dying = false;

    this.boosterManager = this.add.particles("blueEnemyBullet");

    this.booster = this.boosterManager.createEmitter({
      x: this.boss.x,
      y: this.boss.y - this.boss.height / 2,
      speedY: { min: -50, max: -30 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0.1, ease: "Linear", duration: 400 },
      lifespan: 500,
      gravityY: 0,
    });

    console.log("Booster : ", this.booster);

    this.boss.finishOff = () => {
      if (!this.boss.dying) {
        this.boss.dying = true;
        bossDeath.setPosition(this.boss.x, this.boss.y);
        bossDeath.start(false, 1000, 50, 20);

        this.time.delayedCall(1000, () => {
          const explosion = explosions.getFirstExists(false);
          const { x: prevScaleX, y: prevScaleY } = explosion.scale;
          const prevAlpha = explosion.alpha;

          explosion.setPosition(
            this.boss.body.x + this.boss.body.halfWidth,
            this.boss.body.y + this.boss.body.halfHeight
          );
          explosion.setAlpha(0.4);
          explosion.setScale(3);

          const anim = explosion.play("explosion", 30, false, true);
          anim.once("complete", () => {
            explosion.setScale(prevScaleX, prevScaleY);
            explosion.setAlpha(prevAlpha);
          });

          this.boss.kill();
          booster.kill();
          this.boss.dying = false;
          bossDeath.on = false;

          bossLaunchTimer = this.time.delayedCall(
            Phaser.Math.Between(bossSpacing, bossSpacing + 5000),
            launchBoss,
            null,
            this
          );
        });

        blueEnemySpacing = 2500;
        greenEnemySpacing = 1000;
        this.player.health = Math.min(100, this.player.health + 40);
        shields.render();
      }
    };

    function addRay(leftRight) {
      const ray = this.physics.add.sprite(
        leftRight * this.boss.width * 0.75,
        0,
        "deathRay"
      );
      ray.setAlpha(0);
      ray.setVisible(false);
      this.bossContainer.add(ray); // Add ray to the container
      ray.setCrop(0, 0, 40, 40);
      ray.setOrigin(0.5, 0.5);
      ray.setScale(2.5);
      ray.damageAmount = this.boss.damageAmount;
      ray.body.setSize(ray.width / 5, ray.height / 4);

      ray.update = () => {
        ray.setAlpha(Phaser.Math.FloatBetween(0.6, 1));
      };

      this.bossContainer[`ray${leftRight > 0 ? "Right" : "Left"}`] = ray;
    }

    addRay.call(this, 1);
    addRay.call(this, -1);

    const ship = this.add.sprite(0, 0, "boss");
    ship.setOrigin(0.5, 0.5);
    this.bossContainer.add(ship);

    this.boss.fire = () => {
      if (this.time.now > bossBulletTimer) {
        const raySpacing = 3000;
        const chargeTime = 1500;
        const rayTime = 1500;

        const chargeAndShoot = (side) => {
          const ray = this.boss[`ray${side}`];
          ray.name = side;
          ray.setActive(true).setVisible(true);
          ray.setY(80);
          ray.setAlpha(0);
          ray.setScale(1, 13);
          this.tweens.add({
            targets: ray,
            alpha: 1,
            duration: chargeTime,
            onComplete: () => {
              ray.setScale(1, 150);
              this.tweens.add({
                targets: ray,
                y: -1500,
                duration: rayTime,
                onComplete: () => {
                  ray.setActive(false).setVisible(false);
                },
              });
            },
          });
        };

        chargeAndShoot("Right");
        chargeAndShoot("Left");
        bossBulletTimer = this.time.now + raySpacing;
      }
    };

    this.boss.update = () => {
      if (!this.boss.alive) return;

      this.boss.rayLeft.update();
      this.boss.rayRight.update();

      if (this.boss.y > 140) {
        this.boss.body.setAccelerationY(-50);
      }
      if (this.boss.y < 140) {
        this.boss.body.setAccelerationY(50);
      }
      if (this.boss.x > player.x + 50) {
        this.boss.body.setAccelerationX(-50);
      } else if (this.boss.x < player.x - 50) {
        this.boss.body.setAccelerationX(50);
      } else {
        this.boss.body.setAccelerationX(0);
      }
    };

    const bank = this.boss.body.velocity.x / MAXSPEED;
    this.boss.setScale(0.6 - Math.abs(bank) / 3);
    this.boss.angle = 180 - bank * 20;

    this.booster.x = this.boss.x - 5 * bank;
    this.booster.y = this.boss.y + 10 * Math.abs(bank) - this.boss.height / 2;

    const angleToPlayer =
      Phaser.Math.RadToDeg(
        Phaser.Math.Angle.Between(
          this.boss.x,
          this.boss.y,
          this.player.x,
          this.player.y
        )
      ) - 90;
    const anglePointing = 180 - Math.abs(this.boss.angle);
    if (anglePointing - angleToPlayer < 18) {
      this.boss.fire();
    }

    // this.booster = this.add.particles("blueEnemyBullet").createEmitter({
    //   x: this.boss.x,
    //   y: this.boss.y - this.boss.height / 2,
    //   speedY: { min: -50, max: -30 },
    //   scale: { start: 0.3, end: 0 },
    //   alpha: { start: 1, end: 0.1, ease: "Linear", duration: 400 },
    //   lifespan: 500,
    //   gravityY: 0,
    // });

    this.booster.setScale(
      0.3,
      0,
      0.7,
      0,
      5000,
      Phaser.Math.Easing.Quadratic.Out
    );
    this.bossContainer.bringToTop();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.fireButton = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
    console.log("SHIP TRAIL " + this.player.x);
    this.shipTrail = this.add.particles("bullet").createEmitter({
      x: this.player.x,
      y: this.player.y + 10,
      speedX: { min: -30, max: 30 },
      speedY: { min: 180, max: 200 },
      rotate: { min: -50, max: 50 },
      alpha: { start: 1, end: 0.01, ease: "Linear", duration: 800 },
      scale: { start: 0.05, end: 0.4, ease: "Quintic.Out" },
      lifespan: 5000,
    });

    console.log(this.shipTrail, "shiptrail");

    this.explosions = this.physics.add.group({
      key: "explosion",
      frameQuantity: 30,
      active: false,
      visible: false,
    });

    this.explosions.children.iterate((explosion) => {
      explosion.setOrigin(0.5);
      explosion.anims.create({
        key: "explosion",
        frames: this.anims.generateFrameNumbers("explosion"),
        frameRate: 10,
        repeat: -1,
      });
    });
    console.log("PLAYER : " + this.player.x);
    this.playerDeath = this.add.particles("explosion").createEmitter({
      x: this.player.x,
      y: this.player.y,
      maxParticles: 10,
      lifespan: 800,
      scale: { start: 0.1, end: 0.6 },
      alpha: { start: 0.9, end: 0 },
    });
    console.log(this.playerDeath, "PlayerDeath");
    console.log("BOSS : " + this.boss.x);
    this.bossDeath = this.add.particles("explosion").createEmitter({
      x: this.boss.x,
      y: this.boss.y,
      maxParticles: 20,
      lifespan: 900,
      scale: { start: 0.3, end: 1.0 },
      alpha: { start: 0.9, end: 0 },
    });
    console.log(this.bossDeath, "BossDeath");

    this.shields = this.add.bitmapText(
      this.cameras.main.width - 250,
      10,
      "spacefont",
      "",
      50
    );
    this.shields.render = () => {
      this.shields.setText(`Shields: ${Math.max(this.player.health, 0)}%`);
    };
    this.shields.render();

    this.scoreText = this.add.bitmapText(10, 10, "spacefont", "", 50);
    this.scoreText.render = () => {
      this.scoreText.setText(`Score: ${this.score}`);
    };
    this.scoreText.render();

    this.gameOver = this.add.bitmapText(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      "spacefont",
      "GAME OVER!",
      110
    );
    this.gameOver.setOrigin(0.5, 0.33);
    this.gameOver.visible = false;

    //console.log(this.boss);

    //console.log(this.bullets.getChildren());
  }

  update() {
    const ENEMY_SPEED = 300;
    const enemy = this.greenEnemies.getFirstDead();
    console.log("Enemy" + enemy);

    if (enemy) {
      enemy.setPosition(Phaser.Math.Between(0, this.cameras.main.width), -20);
      enemy.body.velocity.x = Phaser.Math.Between(-300, 300);
      enemy.body.velocity.y = ENEMY_SPEED;
      enemy.body.drag.x = 100;

      enemy.trail.start(false, 800, 1);

      enemy.update = () => {
        enemy.angle =
          180 -
          Phaser.Math.RadToDeg(
            Math.atan2(enemy.body.velocity.x, enemy.body.velocity.y)
          );
        enemy.trail.setPosition(enemy.x, enemy.y - 10);

        if (enemy.y > this.cameras.main.height + 200) {
          enemy.setActive(false).setVisible(false);
          enemy.y = -20;
        }
      };
    }

    this.time.addEvent({
      delay: Phaser.Math.Between(
        this.greenEnemySpacing,
        this.greenEnemySpacing + 1000
      ),
      callback: this.launchGreenEnemy,
      callbackScope: this,
      loop: false,
    });
    this.starfield.tilePositionY += 2;
    this.player.body.setAccelerationX(0);

    if (this.cursors.left.isDown) {
      this.player.body.setAccelerationX(-ACCLERATION);
    } else if (this.cursors.right.isDown) {
      this.player.body.setAccelerationX(ACCLERATION);
    }

    if (this.player.x > this.cameras.main.width - 50) {
      this.player.x = this.cameras.main.width - 50;
      this.player.body.setAccelerationX(0);
    }
    if (this.player.x < 50) {
      this.player.x = 50;
      this.player.body.setAccelerationX(0);
    }

    if (
      this.player.alive &&
      (this.fireButton.isDown || this.input.activePointer.isDown)
    ) {
      this.fireBullet();
    }

    if (
      this.input.x < this.cameras.main.width - 20 &&
      this.input.x > 20 &&
      this.input.y > 20 &&
      this.input.y < this.cameras.main.height - 20
    ) {
      var minDist = 200;
      var dist = this.input.x - this.player.x;
      this.player.body.setVelocityX(
        MAXSPEED * Phaser.Math.Clamp(dist / minDist, -1, 1)
      );
    }

    var bank = this.player.body.velocity.x / MAXSPEED;
    this.player.scale.x = 1 - Math.abs(bank) / 2;
    this.player.angle = bank * 30;

    this.shipTrail.x = this.player.x;

    this.physics.overlap(
      this.player,
      this.greenEnemies,
      this.shipCollide,
      null,
      this
    );
    this.physics.overlap(
      this.greenEnemies,
      this.bullets,
      this.hitEnemy,
      null,
      this
    );

    this.physics.overlap(
      this.player,
      this.blueEnemies,
      this.shipCollide,
      null,
      this
    );
    this.physics.overlap(
      this.blueEnemies,
      this.bullets,
      this.hitEnemy,
      null,
      this
    );

    this.physics.overlap(
      this.boss,
      this.bullets,
      this.hitEnemy,
      this.bossHitTest,
      this
    );
    this.physics.overlap(
      this.player,
      this.boss.rayLeft,
      this.enemyHitsPlayer,
      null,
      this
    );
    this.physics.overlap(
      this.player,
      this.boss.rayRight,
      this.enemyHitsPlayer,
      null,
      this
    );

    this.physics.overlap(
      this.blueEnemyBullets,
      this.player,
      this.enemyHitsPlayer,
      null,
      this
    );

    if (!this.player.alive && !this.gameOver.visible) {
      this.gameOver.visible = true;
      this.gameOver.alpha = 0;
      this.tweens.add({
        targets: this.gameOver,
        alpha: 1,
        duration: 1000,
        ease: "Quintic.Out",
        onComplete: () => this.setResetHandlers(),
      });

      this.setResetHandlers = () => {
        this.tapRestart = this.input.once("pointerup", this.restart, this);
        this.spaceRestart = this.fireButton.on("down", this.restart, this);
      };
    }
  }

  launchGreenEnemy() {
    const ENEMY_SPEED = 300;
    const enemy = this.greenEnemies.getFirstDead();

    if (enemy) {
      enemy.setPosition(Phaser.Math.Between(0, this.cameras.main.width), -20);
      enemy.body.velocity.x = Phaser.Math.Between(-300, 300);
      enemy.body.velocity.y = ENEMY_SPEED;
      enemy.body.drag.x = 100;

      enemy.trail.start(false, 800, 1);

      enemy.update = () => {
        enemy.angle =
          180 -
          Phaser.Math.RadToDeg(
            Math.atan2(enemy.body.velocity.x, enemy.body.velocity.y)
          );
        enemy.trail.setPosition(enemy.x, enemy.y - 10);

        if (enemy.y > this.cameras.main.height + 200) {
          enemy.setActive(false).setVisible(false);
          enemy.y = -20;
        }
      };
    }

    this.time.addEvent({
      delay: Phaser.Math.Between(
        this.greenEnemySpacing,
        this.greenEnemySpacing + 1000
      ),
      callback: this.launchGreenEnemy,
      callbackScope: this,
      loop: false,
    });
  }

  launchBoss() {
    this.boss.setPosition(this.cameras.main.centerX, -this.boss.height);
    this.booster.start(false, 1000, 10);
    this.boss.health = 501;
    this.bossBulletTimer = this.time.now + 5000;
  }

  launchBlueEnemy() {
    const startingX = Phaser.Math.Between(100, this.cameras.main.width - 100);
    const verticalSpeed = 180;
    const spread = 60;
    const frequency = 70;
    const verticalSpacing = 70;
    const numEnemiesInWave = 5;

    for (let i = 0; i < numEnemiesInWave; i++) {
      const enemy = this.blueEnemies.getFirstDead();
      if (enemy) {
        enemy.startingX = startingX;
        enemy.setPosition(this.cameras.main.centerX, -verticalSpacing * i);
        enemy.body.velocity.y = verticalSpeed;

        const bulletSpeed = 400;
        const firingDelay = 2000;
        enemy.bullets = 1;
        enemy.lastShot = 0;

        enemy.update = () => {
          enemy.body.x =
            enemy.startingX + Math.sin(enemy.y / frequency) * spread;

          const bank = Math.cos((enemy.y + 60) / frequency);
          enemy.scale.x = 0.5 - Math.abs(bank) / 8;
          enemy.angle = 180 - bank * 2;

          const enemyBullet = this.blueEnemyBullets.getFirstDead();
          if (
            enemyBullet &&
            enemy.active &&
            enemy.bullets &&
            enemy.y > this.cameras.main.height / 8 &&
            this.time.now > firingDelay + enemy.lastShot
          ) {
            enemy.lastShot = this.time.now;
            enemy.bullets--;
            enemyBullet.setPosition(enemy.x, enemy.y + enemy.height / 2);
            enemyBullet.damageAmount = enemy.damageAmount;
            const angle = Phaser.Physics.Arcade.MoveToObject(
              enemyBullet,
              this.player,
              bulletSpeed
            );
            enemyBullet.angle = Phaser.Math.RadToDeg(angle);
          }

          if (enemy.y > this.cameras.main.height + 200) {
            enemy.setActive(false).setVisible(false);
          }
        };
      }
    }

    this.blueEnemyLaunchTimer = this.time.addEvent({
      delay: Phaser.Math.Between(
        this.blueEnemySpacing,
        this.blueEnemySpacing + 4000
      ),
      callback: this.launchBlueEnemy,
      callbackScope: this,
      loop: false,
    });
  }

  // addEnemyEmitterTrail(enemy) {
  //   console.log("EnemyEmitter");
  //   console.log(enemy);
  //   const enemyTrail = this.add.particles("explosion").createEmitter({
  //     x: enemy.x,
  //     y: enemy.y - 10,
  //     speed: { min: -20, max: 20 },
  //     angle: { min: 50, max: -50 },
  //     lifespan: 800,
  //     quantity: 100,
  //     scale: { start: 0.01, end: 0.1 },
  //     alpha: { start: 0.4, end: 0 },
  //     blendMode: "ADD",
  //   });
  //   enemy.trail = enemyTrail;
  // }

  shipCollide(player, enemy) {
    enemy.destroy();

    player.damage(enemy.damageAmount);
    this.shields.render();

    if (player.alive) {
      const explosion = this.explosions.getFirstDead();
      if (explosion) {
        explosion.setPosition(
          player.body.x + player.body.halfWidth,
          player.body.y + player.body.halfHeight
        );
        explosion.setAlpha(0.7);
        explosion.play("explosion", true);
      }
    } else {
      this.playerDeath.setPosition(player.x, player.y);
      this.playerDeath.explode(10, 10);
    }
  }

  hitEnemy() {
    const explosion = this.explosions.getFirstDead();
    if (explosion) {
      explosion.setPosition(
        this.bullet.body.x + this.bullet.body.halfWidth,
        this.bullet.body.y + this.bullet.body.halfHeight
      );
      explosion.body.velocity.y = this.enemy.body.velocity.y;
      explosion.setAlpha(0.7);
      explosion.play("explosion", true);
    } else {
      console.warn("No available explosion!");
    }

    if (typeof this.enemy.finishOff === "function" && this.enemy.health < 5) {
      this.enemy.finishOff();
    } else if (this.enemy.damage) {
      this.enemy.damage(this.enemy.damageAmount);
    }

    this.bullet.destroy();

    // Increase score
    this.score += this.enemy.damageAmount * 10;
    this.scoreText.setText(`Score: ${this.score}`);

    // Adjust pacing
    this.greenEnemySpacing *= 0.9;

    // Launch blue enemies after a score of 1000
    if (!this.blueEnemyLaunched && this.score > 1000) {
      this.blueEnemyLaunched = true;
      this.launchBlueEnemy();
      this.greenEnemySpacing *= 2;
    }

    // Launch the boss after a score of 15000
    if (!this.bossLaunched && this.score > 15000) {
      this.greenEnemySpacing = 5000;
      this.blueEnemySpacing = 12000;
      this.time.delayedCall(2000, () => {
        this.bossLaunched = true;
        this.launchBoss();
      });
    }

    // Weapon upgrade
    if (this.score > 5000 && this.player.weaponLevel < 2) {
      this.player.weaponLevel = 2;
      console.log("Weapon upgraded to level 2!");
    }
  }

  bossHitTest() {
    // change this function
    if (
      (this.bullet.x > this.boss.x + this.boss.width / 5 &&
        this.bullet.y > this.boss.y) ||
      (this.bullet.x < this.boss.x - this.boss.width / 5 &&
        this.bullet.y > this.boss.y)
    ) {
      return false;
    }
    return true;
  }

  enemyHitsPlayer() {
    // change this
    bullet.destroy();

    this.player.damage(this.bullet.damageAmount);
    this.shields.render();

    if (this.player.alive) {
      const explosion = this.explosions.getFirstDead();
      if (explosion) {
        explosion.setPosition(
          this.player.body.x + this.player.body.halfWidth,
          this.player.body.y + this.player.body.halfHeight
        );
        explosion.setAlpha(0.7);
        explosion.play("explosion", true);
      }
    } else {
      this.playerDeath.setPosition(this.player.x, this.player.y);
      this.playerDeath.start(false, 1000, 10, 10);
    }
  }

  restart() {
    // Reset the enemies
    this.greenEnemies.getChildren().forEach((enemy) => enemy.destroy());
    this.time.removeEvent(this.greenEnemyLaunchTimer);
    this.time.addEvent({
      delay: 1000,
      callback: this.launchGreenEnemy,
      callbackScope: this,
      loop: false,
    });

    this.blueEnemies.getChildren().forEach((enemy) => enemy.destroy());
    this.blueEnemyBullets.getChildren().forEach((bullet) => bullet.destroy());
    this.time.removeEvent(this.blueEnemyLaunchTimer);
    this.boss.destroy();
    this.booster.destroy();
    this.time.removeEvent(this.bossLaunchTimer);

    // Revive the player
    this.player.weaponLevel = 1;
    this.player.revive();
    this.player.health = 100;
    this.shields.render();
    this.score = 0;
    this.scoreText.render();

    // Hide the text
    this.gameOver.visible = false;

    // Reset pacing
    this.greenEnemySpacing = 1000;
    this.blueEnemyLaunched = false;
    this.bossLaunched = false;
  }
}

export default GameScene;
