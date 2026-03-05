import Phaser from "phaser";
import GameData from "../../GameData";
import MusicManager from "../audio/MusicManager";
import SfxManager from "../audio/SfxManager";

export default class Credits extends Phaser.Scene {

  private static readonly MENU_MUSIC_KEY = "menu-theme";
  private static readonly RAIN_SFX_KEY = "rain-sfx";

  constructor(){
    super({ key: "Credits" });
  }

  preload(){
    this.load.image("bg_credits","../assets/images/bg_credits.png");
  }

  create(){

    const { width, height } = this.scale;

    this.sound.pauseOnBlur = false;

    // musica e pioggia come nel menu
    MusicManager.start(this, Credits.MENU_MUSIC_KEY, {
      loop: true,
      volume: GameData.musicVolume ?? 0.6
    });

    SfxManager.start(this, Credits.RAIN_SFX_KEY, {
      loop: true,
      volume: GameData.sfxVolume ?? 0.35
    });

    // =========================
    // BACKGROUND
    // =========================

    const bg = this.add.image(width/2, height/2, "bg_credits");

    const scale = Math.max(
      width / bg.width,
      height / bg.height
    );

    bg.setScale(scale);

    const neon = "#70fdc2";

    // =========================
    // TITLE
    // =========================

    this.add.text(
      width/2,
      height * 0.10,
      "C R E D I T S",
      {
        fontFamily: "Pixelify Sans",
        fontSize: "75px",
        color: neon
      }
    )
    .setOrigin(0.5);

    // =========================
    // CREDITI
    // =========================

    // =========================
// LEFT COLUMN
// =========================

const leftCredits = [
  "GAME DESIGN",
  "Your Name",
  "",
  "PROGRAMMING",
  "Your Name"
];

this.add.text(
  width * 0.35,
  height * 0.55,
  leftCredits,
  {
    fontFamily: "Pixelify Sans",
    fontSize: "35px",
    color: "#ffffff",
    align: "center",
    lineSpacing: 12
  }
)
.setOrigin(0.5);

// =========================
// RIGHT COLUMN
// =========================

const rightCredits = [
  "ART",
  "Your Name",
  "",
  "MUSIC & SOUND",
  "Your Name"
];

this.add.text(
  width * 0.65,
  height * 0.55,
  rightCredits,
  {
    fontFamily: "Pixelify Sans",
    fontSize: "35px",
    color: "#ffffff",
    align: "center",
    lineSpacing: 12
  }
)
.setOrigin(0.5);

// =========================
// BACK ARROW (top left)
// =========================

const backArrow = this.add.text(
  60,
  50,
  "<",
  {
    fontFamily: "Pixelify Sans",
    fontSize: "50px",
    color: neon
  }
)
.setOrigin(0.5)
.setInteractive({ useHandCursor: true });

backArrow.on("pointerover", ()=>{
  backArrow.setScale(1.15);
  backArrow.setColor("#ffffff");
});

backArrow.on("pointerout", ()=>{
  backArrow.setScale(1);
  backArrow.setColor(neon);
});

backArrow.on("pointerdown", ()=>{
  SfxManager.start(this,"ui_click",{volume:0.6});
  this.scene.start("Menu");
});

  }

}