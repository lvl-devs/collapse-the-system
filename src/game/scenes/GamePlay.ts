import Phaser from "phaser";
import { GameData } from "../../GameData";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import LevelStorage from "../systems/LevelStorage";
import CharacterController, { createKeyboardMovementInput } from "../entities/CharacterController";

const PLAYER_SPEED = 250;

export default class GamePlay extends Phaser.Scene {
  private static readonly LEVEL_MUSIC_BY_LEVEL: Record<number, string> = {
    1: "level-1-theme",
  };

  private playerController!: CharacterController;
  private hasPlayerReachedStairs = false;
  private currentLevel = 1;
  private escPauseKey?: Phaser.Input.Keyboard.Key;
  private collisionDebugKey?: Phaser.Input.Keyboard.Key;
  private debugMode = false;
  private tileDebugGraphics?: Phaser.GameObjects.Graphics;
  private currentLevelMusicKey?: string;
  private pausedSfxDuringPause: Phaser.Sound.BaseSound[] = [];
  private isAudioPausedForMenu = false;

  constructor() {
    super({ key: "GamePlay" });
  }

  preload() {
    AssetPipeline.startDeferredPreload(this);
  }

  create() {
    this.input.keyboard?.resetKeys();

    this.currentLevel = LevelStorage.getCurrentLevel();
    this.hasPlayerReachedStairs = false;
    this.startLevelMusic(this.currentLevel);

    this.events.on(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.resumeCurrentLevelMusic, this);

    const map = this.make.tilemap({ key: "static-map" });
    const tilesets: Phaser.Tilemaps.Tileset[] = [];
    
    // Mappatura tileset standard
    const TS_MAP: Record<string, string> = {
        "home": "tileset-cyber",
        "server-rack": "server-rack-closed"
    };

    map.tilesets.forEach(t => {
        const key = TS_MAP[t.name] || t.name;
        if (this.textures.exists(key)) {
            const added = map.addTilesetImage(t.name, key);
            if (added) tilesets.push(added);
        }
    });

    const activeLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const floorGids = [43, 44, 45, 46, 107, 109, 110];
    let allFloorTiles: Phaser.Tilemaps.Tile[] = [];

    map.layers.forEach(layerData => {
        const layer = map.createLayer(layerData.name, tilesets, 0, 0);
        if (!layer) return;

        if (layerData.x) layer.setX(layerData.x);
        if (layerData.y) layer.setY(layerData.y);

        // Escludi il pavimento dalle collisioni per permettere il movimento
        layer.setCollisionByExclusion([-1, ...floorGids]);
        activeLayers.push(layer);

        layer.forEachTile(tile => {
            if (tile.index === -1) return;
            const px = tile.pixelX + (layerData.x || 0);
            const py = tile.pixelY + (layerData.y || 0);
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px + 32);
            maxY = Math.max(maxY, py + 32);

            // Raccogli i tile di pavimento per lo spawn
            if (floorGids.includes(tile.index)) {
                allFloorTiles.push(tile);
            }
        });
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    let spawnX = centerX;
    let spawnY = centerY;

    // Filtriamo i tile di pavimento per trovare quelli "liberi" (senza oggetti sopra)
    const clearFloorTiles = allFloorTiles.filter(tile => {
        // Controlla se negli altri layer (es. objects) c'è qualcosa alle stesse coordinate
        return !activeLayers.some(layer => {
            if (layer === tile.tilemapLayer) return false;
            const otherTile = layer.getTileAt(tile.x, tile.y);
            return otherTile && otherTile.index !== -1;
        });
    });

    const candidateTiles = clearFloorTiles.length > 0 ? clearFloorTiles : allFloorTiles;

    if (candidateTiles.length > 0) {
        // Cerchiamo un tile che sia il più possibile "centrale" rispetto alla massa di tile
        // O semplicemente quello più vicino al centro geometrico
        let bestTile = candidateTiles[0];
        let minDistance = Infinity;
        
        candidateTiles.forEach(tile => {
            const tx = tile.pixelX + 16;
            const ty = tile.pixelY + 16;
            const dist = Phaser.Math.Distance.Between(centerX, centerY, tx, ty);
            if (dist < minDistance) {
                minDistance = dist;
                bestTile = tile;
            }
        });
        spawnX = bestTile.pixelX + 16;
        spawnY = bestTile.pixelY + 16;
    }

    const playerInput = createKeyboardMovementInput(this);
    this.playerController = new CharacterController({
      scene: this,
      x: spawnX, 
      y: spawnY,
      textureKey: "hacker",
      animationNamespace: "player-hacker",
      speed: PLAYER_SPEED,
      frameConfig: {
        walk: {
          down: { start: 0, end: 2 },
          left: { start: 3, end: 5 },
          right: { start: 6, end: 8 },
          up: { start: 9, end: 11 },
        },
        idle: {
          down: 0,
          left: 3,
          right: 6,
          up: 9,
        },
      },
      inputProvider: playerInput,
      initialDirection: "down",
      depth: 10,
      bounce: 0,
      collideWorldBounds: true,
      frameRate: 8,
      repeat: -1,
      prioritizeVertical: true,
    });

    // Collisioni su tutti i layer
    activeLayers.forEach(l => this.physics.add.collider(this.playerController.sprite, l));

    this.cameras.main.setBounds(minX, minY, maxX - minX, maxY - minY);
    this.physics.world.setBounds(minX, minY, maxX - minX, maxY - minY);
    this.cameras.main.startFollow(this.playerController.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBackgroundColor("#000000");

    this.escPauseKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.collisionDebugKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.escPauseKey?.on("down", this.openPauseMenu, this);

    this.add
      .text(16, 16, `Level: ${this.currentLevel}\nESC -> Menu | C -> Debug Collisioni`, {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize: "14px",
        color: "#aaaacc",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PAUSE, this.pauseCurrentLevelAudio, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.resumeCurrentLevelMusic, this);
      this.escPauseKey?.off("down", this.openPauseMenu, this);
      this.escPauseKey = undefined;
      this.collisionDebugKey = undefined;
      this.tileDebugGraphics?.destroy();
    });

    console.log(
      `[GamePlay] Level ${this.currentLevel}`
    );
  }

  update() {
    if (this.hasPlayerReachedStairs) return;

    if (this.collisionDebugKey != null && Phaser.Input.Keyboard.JustDown(this.collisionDebugKey)) {
      this.toggleCollisionDebug();
    }

    this.playerController.update();
  }

  private toggleCollisionDebug(): void {
    this.debugMode = !this.debugMode;
    
    // Trova tutti i layer dinamicamente
    const currentLayers = this.children.list.filter(c => c instanceof Phaser.Tilemaps.TilemapLayer) as Phaser.Tilemaps.TilemapLayer[];

    if (this.debugMode) {
      this.physics.world.drawDebug = true;
      this.physics.world.createDebugGraphic();
      
      if (!this.tileDebugGraphics) {
          this.tileDebugGraphics = this.add.graphics().setDepth(50);
      } else {
          this.tileDebugGraphics.clear();
      }

      currentLayers.forEach((layer, i) => {
        // Cambiamo i colori in base all'indice per distinguerli
        const rHue = (100 * (i + 1)) % 255;
        const gHue = (50 * (i + 1)) % 255;
        const bHue = (150 * (i + 1)) % 255;

        layer.renderDebug(this.tileDebugGraphics!, {
          tileColor: null,
          collidingTileColor: new Phaser.Display.Color(rHue, gHue, bHue, 120),
          faceColor: new Phaser.Display.Color(255, 120, 0, 255),
        });
      });
    } else {
      this.physics.world.drawDebug = false;
      this.physics.world.debugGraphic?.clear();
      this.physics.world.debugGraphic?.destroy();
      this.tileDebugGraphics?.clear();
      this.tileDebugGraphics?.destroy();
      this.tileDebugGraphics = undefined;
    }
  }

  private openPauseMenu(): void {
    if (this.scene.isActive("PauseMenu")) {
      return;
    }
    this.pauseCurrentLevelAudio();
    this.scene.launch("PauseMenu", { parentSceneKey: this.scene.key });
    this.scene.pause();
  }

  private startLevelMusic(level: number): void {
    const fallbackLevel = 1;
    const musicKey = GamePlay.LEVEL_MUSIC_BY_LEVEL[level] ?? GamePlay.LEVEL_MUSIC_BY_LEVEL[fallbackLevel];
    if (!musicKey) {
      this.currentLevelMusicKey = undefined;
      return;
    }

    this.currentLevelMusicKey = musicKey;

    MusicManager.startForScene(this, musicKey, {
      loop: true,
      volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6),
    });
  }

  private pauseCurrentLevelAudio(): void {
    if (this.isAudioPausedForMenu) {
      return;
    }

    this.isAudioPausedForMenu = true;

    if (!this.currentLevelMusicKey) {
      this.pauseActiveSfx();
      return;
    }

    MusicManager.pause(this, this.currentLevelMusicKey);
    this.pauseActiveSfx();
  }

  private resumeCurrentLevelMusic(): void {
    if (!this.isAudioPausedForMenu) {
      return;
    }

    this.isAudioPausedForMenu = false;

    if (!this.currentLevelMusicKey) {
      this.startLevelMusic(this.currentLevel);
    } else {
      MusicManager.resume(this, this.currentLevelMusicKey, {
        loop: true,
        volume: MusicManager.toEngineVolume(GameData.musicVolume ?? 0.6),
      });
    }

    this.resumePausedSfx();
  }

  private pauseActiveSfx(): void {
    this.pausedSfxDuringPause = [];
    const sounds = ((this.sound as unknown as { sounds?: Phaser.Sound.BaseSound[] }).sounds ?? []);

    sounds.forEach((sound) => {
      const soundAny = sound as any;
      const key = soundAny.key as string | undefined;
      if (key != null && key === this.currentLevelMusicKey) {
        return;
      }
      if (soundAny.isPlaying) {
        sound.pause();
        this.pausedSfxDuringPause.push(sound);
      }
    });
  }

  private resumePausedSfx(): void {
    this.pausedSfxDuringPause.forEach((sound) => {
      const soundAny = sound as any;
      if (soundAny.isPaused) {
        sound.resume();
      }
    });
    this.pausedSfxDuringPause = [];
  }
}
