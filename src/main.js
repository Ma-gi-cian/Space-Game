import Phaser from "phaser";
import Initial from "./scene/initial";
import Game from "./scene/Game";

console.log("Height: " + window.innerHeight + ", width: " + window.innerWidth);

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: window.innerWidth, // 800
  height: window.innerHeight, // 600
  scene: [Initial, Game],
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },

  title: "Space WarFare",
};

const game = new Phaser.Game(config);
