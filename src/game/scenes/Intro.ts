import Phaser from "phaser";
import { GameData } from "../../GameData";

export default class Intro extends Phaser.Scene {
  constructor() {
    super({ key: "Intro" });
  }

  preload() {
    this.cameras.main.setBackgroundColor(GameData.globals.bgColor);
    
    // Temporarily reset the baseURL to load from the public root instead of /assets/
    const previousBaseURL = this.load.baseURL;
    this.load.setBaseURL("");
    this.load.setPath("");
    
    this.load.image("favicon", "favicon.png");
    
    this.load.once("complete", () => {
        this.load.setBaseURL(previousBaseURL);
    });
  }

  create() {
    const screenCenterX = this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY = this.cameras.main.worldView.y + this.cameras.main.height / 2;

    const logo = this.add
      .image(screenCenterX, screenCenterY, "favicon")
      .setAlpha(0)
      .setAngle(-8);

    // Scale down the favicon if it's too big, or scale it up if it's too small
    const targetScale = Math.min(this.cameras.main.width / logo.width, this.cameras.main.height / logo.height) * 0.44;
    logo.setScale(targetScale * 0.72);

    this.tweens.add({
      targets: logo,
      alpha: 1,
      scale: targetScale * 1.1,
      y: screenCenterY - 14,
      angle: 0,
      duration: 700,
      ease: "Back.Out",
      onComplete: () => {
        this.tweens.add({
          targets: logo,
          scale: targetScale,
          y: screenCenterY,
          duration: 450,
          ease: "Sine.Out"
        });

        this.tweens.add({
          targets: logo,
          y: screenCenterY - 8,
          angle: 2,
          duration: 800,
          ease: "Sine.InOut",
          yoyo: true,
          repeat: -1
        });

        this.tweens.add({
          targets: logo,
          scale: targetScale * 1.045,
          duration: 760,
          ease: "Sine.InOut",
          yoyo: true,
          repeat: -1
        });
      }
    });

    this.time.delayedCall(2500, () => {
      this.tweens.killTweensOf(logo);
      this.tweens.add({
        targets: logo,
        alpha: 0,
        scale: targetScale * 0.9,
        y: screenCenterY + 18,
        duration: 500,
        ease: "Power2.In",
        onComplete: () => {
          this.scene.start("Preloader");
        }
      });
    });
  }
}
