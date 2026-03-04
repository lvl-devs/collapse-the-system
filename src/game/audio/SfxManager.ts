import Phaser from "phaser";

export default class SfxManager {
  static start(
    scene: Phaser.Scene,
    key: string,
    config: Phaser.Types.Sound.SoundConfig = {}
  ): Phaser.Sound.BaseSound | undefined {
    if (!scene.cache.audio.exists(key)) {
      return;
    }

    const sound = scene.sound.add(key, {
      ...config,
      volume: config.volume ?? 1,
      loop: false
    });

    sound.play();
    return sound;
  }

  static stop(scene: Phaser.Scene, key: string): void {
    scene.sound.stopByKey(key);
  }
}
