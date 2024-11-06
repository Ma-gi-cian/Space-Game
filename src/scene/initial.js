import Phaser from "phaser";

class Initial extends Phaser.Scene {
  constructor() {
    super({ key: "Initial" });
  }

  preload() {
    this.load.image("starfield", "assets/starfield.png");
    console.log("Preload finished");
  }

  create() {
    // Add text to the center of the screen
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    this.starfield = this.add
      .tileSprite(0, 0, screenWidth, screenHeight, "starfield")
      .setOrigin(0, 0);

    const titleText = this.add
      .text(
        screenWidth * 0.5,
        screenHeight * 0.5,
        "Space Warfare\n by Bhabya Jha",
        {
          fontSize: "32px",
          fill: "#ffffff",
          align: "center",
        }
      )
      .setOrigin(0.5, 0.5); // Center the text

    // Set up click event to transition to the Game scene
    this.input.on("pointerdown", () => {
      this.scene.start("Game");
    });
  }
}

export default Initial;
