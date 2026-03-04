import Phaser from "phaser";
import GameData from "../../GameData";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";

export default class Menu extends Phaser.Scene {
  private static readonly MENU_MUSIC_KEY = "menu-theme";

  constructor(){ super({ key: "Menu" }); }

  create(){
    this.sound.pauseOnBlur = false;
    AssetPipeline.startDeferredPreload(this);
    MusicManager.startForScene(this, Menu.MENU_MUSIC_KEY, {
      loop: true,
      volume: GameData.musicVolume ?? GameData.settings.audio
    });

    const { width, height } = this.scale;
    const items = [
      { label: "Play", scene: "GamePlay" },
      { label: "Options", scene: "Options" },
      { label: "Credits", scene: "Credits" },
    ];
    const bgVideo = this.add.video(width / 2, height / 2, "bg-menu");
    bgVideo.setOrigin(0.5);
    bgVideo.play(true); // loop
    bgVideo.on('created', () => {
      const scaleX = width / bgVideo.width;
      const scaleY = height / bgVideo.height;
      const scale = Math.max(scaleX, scaleY);
      bgVideo.setScale(scale);
    });
    
    this.add
      .text(width * 0.05, height * 0.05, GameData.globals.gameTitle, {
        color: "#70fdc2",
        wordWrap: { width: width * 0.8 },
      })
      .setFontSize(150)
      .setFontFamily(GameData.preloader.loadingTextFont)
      .setScale(Math.min(width / 1920, height / 1080) * 1.05);

    items.forEach((item, index) => {
      const baseX = width * 0.05;
      const baseY = height * 0.6;
      const gap = 80;
      const startY = baseY + index * gap;

      this.add
        .text(baseX, startY, item.label.toUpperCase(), {
          color: "#70fdc2",
        })
        .setFontSize(60)
        .setFontFamily(GameData.preloader.loadingTextFont)
        .setShadow(3, 3, "#001E17", 0, false, true);
    });
  }
}
