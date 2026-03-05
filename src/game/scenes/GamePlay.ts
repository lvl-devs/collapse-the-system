// ====================================================================
// GamePlay.ts
// Scena principale di gioco — genera il dungeon e gestisce il player
//
// Architettura basata su:
// "Modular Game Worlds in Phaser 3 (Tilemaps #3) - Procedural Dungeon"
// di Michael Hadley
// ====================================================================

import Phaser from "phaser";
import { GameData } from "../../GameData";
import DungeonGenerator from "../systems/DungeonGenerator";
import type { DungeonBuildResult } from "../systems/DungeonGenerator";
import AssetPipeline from "../systems/AssetPipeline";
import MusicManager from "../audio/MusicManager";
import { DEFAULT_TILES } from "../systems/TileMapping";

const PLAYER_SPEED = 160;

export default class GamePlay extends Phaser.Scene {
  // ── Layer / mappa ──────────────────────────────────────────────────
  private dungeonResult!: DungeonBuildResult;

  // ── Player ─────────────────────────────────────────────────────────
  private player!: Phaser.Physics.Arcade.Sprite;

  // ── Input ──────────────────────────────────────────────────────────
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  // ── Stato scena ───────────────────────────────────────────────────
  private hasPlayerReachedStairs = false;
  private level = 0;
  private debugMode = false;
  private tileDebugGraphics?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "GamePlay" });
  }

  // ───────────────────────────────────────────────────────────────────
  // PRELOAD
  // ───────────────────────────────────────────────────────────────────

  preload() {
    // Carica gli asset differiti (audio, immagini extra, ecc.)
    AssetPipeline.startDeferredPreload(this);

    // Crea una texture placeholder per il player (canvas ciano 12x12)
    if (!this.textures.exists("player-placeholder")) {
      const tex = this.textures.createCanvas("player-placeholder", 12, 12);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = "#00aaff";
        ctx.fillRect(0, 0, 12, 12);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, 11, 11);
        tex.refresh();
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // CREATE
  // Struttura identica alla guida di Michael Hadley:
  //   1. Genera dungeon (DungeonGenerator.buildTilemap)
  //   2. Posiziona il player nella startRoom
  //   3. Collisioni player vs groundLayer e stuffLayer
  //   4. Callback scala -> livello successivo (scene.restart)
  //   5. Camera segue il player, bounded alla mappa
  // ───────────────────────────────────────────────────────────────────

  create() {
    this.level++;
    this.hasPlayerReachedStairs = false;

    // ── 1. Genera il dungeon ────────────────────────────────────────
    const cfg = GameData.dungeon.defaultConfig;
    this.dungeonResult = DungeonGenerator.buildTilemap(this, {
      ...cfg,
      theme: GameData.dungeon.defaultTheme,
    });

    const { groundLayer, stuffLayer, startX, startY, map } = this.dungeonResult;

    // ── 2. Sfondo camera ────────────────────────────────────────────
    const theme = GameData.dungeon.defaultTheme;
    const bgColors: Record<string, string> = {
      cyber:    "#04040f",
      cave:     "#060402",
      facility: "#030605",
      void:     "#000000",
    };
    this.cameras.main.setBackgroundColor(bgColors[theme] ?? "#000000");

    // ── 3. Player ───────────────────────────────────────────────────
    this.player = this.physics.add.sprite(startX, startY, "player-placeholder");
    this.player.setDepth(10);
    this.player.setBounce(0);
    this.player.setCollideWorldBounds(true);

    // ── 4. Collisioni ───────────────────────────────────────────────
    this.physics.add.collider(this.player, groundLayer);
    this.physics.add.collider(this.player, stuffLayer);

    // ── 5. Callback scale -> livello successivo ──────────────────────
    // Quando il player calpesta la tile "STAIRS" nella stuffLayer,
    // la scena riparte (nuovo dungeon generato, livello incrementato)
    stuffLayer.setTileIndexCallback(DEFAULT_TILES.STAIRS, () => {
      stuffLayer.setTileIndexCallback(DEFAULT_TILES.STAIRS, () => {}, this);
      this.hasPlayerReachedStairs = true;
      this.player.setVelocity(0, 0);

      const cam = this.cameras.main;
      cam.fade(300, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => {
        this.scene.restart();
      });
    }, this);

    // ── 6. Camera ────────────────────────────────────────────────────
    // setBounds e' gia' chiamato dentro DungeonGenerator.buildTilemap()
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // ── 7. Input ─────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // ESC -> Menu
    this.input.keyboard!.once("keydown-ESC", () => {
      MusicManager.stop(this, "game-theme");
      this.scene.start("Menu");
    });

    // C -> toggle collision debug (sprite bodies + tile collision boxes)
    this.input.keyboard!.on("keydown-C", () => {
      this.debugMode = !this.debugMode;
      const { groundLayer, stuffLayer } = this.dungeonResult;

      if (this.debugMode) {
        // Sprite / body debug
        this.physics.world.drawDebug = true;
        this.physics.world.createDebugGraphic();

        // Tile debug: rettangoli rossi sui tile con collisione attiva
        this.tileDebugGraphics = this.add.graphics().setDepth(50);
        groundLayer.renderDebug(this.tileDebugGraphics, {
          tileColor:         null,
          collidingTileColor: new Phaser.Display.Color(255, 60, 60, 120),
          faceColor:          new Phaser.Display.Color(255, 120, 0, 255),
        });
        stuffLayer.renderDebug(this.tileDebugGraphics, {
          tileColor:         null,
          collidingTileColor: new Phaser.Display.Color(255, 200, 0, 120),
          faceColor:          new Phaser.Display.Color(255, 255, 0, 255),
        });
      } else {
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic?.clear();
        this.physics.world.debugGraphic?.destroy();
        this.tileDebugGraphics?.destroy();
        this.tileDebugGraphics = undefined;
      }
    });

    // ── 8. HUD ───────────────────────────────────────────────────────
    this.add
      .text(16, 16, `Livello: ${this.level}\nESC -> Menu`, {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "14px",
        color:      "#aaaacc",
        backgroundColor: "#00000088",
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    // Hint debug
    this.add
      .text(16, 48, "C -> collision debug", {
        fontFamily: GameData.globals.defaultFont.key,
        fontSize:   "11px",
        color:      "#666688",
        backgroundColor: "#00000066",
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    console.log(
      `[GamePlay] Livello ${this.level} -- ${map.width}x${map.height} tile` +
      ` -- ${this.dungeonResult.dungeon.rooms.length} stanze` +
      ` -- tema: ${GameData.dungeon.defaultTheme}`
    );
  }

  update() {
    if (this.hasPlayerReachedStairs) return;

    const left  = this.wasd.left.isDown  || this.cursors.left.isDown;
    const right = this.wasd.right.isDown || this.cursors.right.isDown;
    const up    = this.wasd.up.isDown    || this.cursors.up.isDown;
    const down  = this.wasd.down.isDown  || this.cursors.down.isDown;

    const vx = left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0;
    const vy = up   ? -PLAYER_SPEED : down  ? PLAYER_SPEED : 0;

    this.player.setVelocity(vx, vy);
  }
}