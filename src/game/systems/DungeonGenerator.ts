// ====================================================================
// DungeonGenerator.ts
// Generazione procedurale di mappe dungeon per Phaser 3
//
// Architettura basata su:
// "Modular Game Worlds in Phaser 3 (Tilemaps #3) - Procedural Dungeon"
// di Michael Hadley  (https://github.com/mikewesthad/phaser-3-tilemap-blog-posts)
//
// Usa @mikewesthad/dungeon per la generazione di stanze e porte.
// Il tileset viene creato runtime tramite canvas colorati (un colore per
// categoria di tile) seguendo gli stessi indici del buch-tileset originale.
// ====================================================================

import Phaser from "phaser";
import Dungeon from "@mikewesthad/dungeon";
import type { Room } from "@mikewesthad/dungeon";
import { DEFAULT_TILES, createCanvasTileset } from "./TileMapping";

// Re-export di Room per comodità
export type { Room };

// ──────────────────────────────────────────────────────────────────────────────
// TIPI PUBBLICI
// ──────────────────────────────────────────────────────────────────────────────

export type DungeonThemeKey = "cyber" | "cave" | "facility" | "void";

/** Aspetto visivo e sfondo di un tema dungeon */
export interface DungeonTheme {
  key: DungeonThemeKey;
  label: string;
  /** Chiave asset immagine tileset (caricata da GameData.images) */
  tilesetKey: string;
  /** Percorso tileset (relativo a /assets/) */
  tilesetPath: string;
  /** Colore di sfondo HEX per la camera */
  bgColor: string;
}

/** Parametri passati a DungeonGenerator.buildTilemap() */
export interface DungeonConfig {
  /** Larghezza griglia in tile */
  width: number;
  /** Altezza griglia in tile */
  height: number;
  /** Dimensione in px di ogni tile */
  tileSize: number;
  /** Tema visivo */
  theme: DungeonThemeKey;
  /** Seed stringa per la PRNG (opzionale) */
  seed?: string;
  /** Distanza minima di ogni porta dall'angolo della stanza (default 2) */
  doorPadding?: number;
  rooms: {
    width:  { min: number; max: number; onlyOdd?: boolean };
    height: { min: number; max: number; onlyOdd?: boolean };
    /** Numero massimo di stanze */
    maxRooms?: number;
    /** Area massima di una singola stanza (tile²) */
    maxArea?: number;
  };
}

/** Risultato restituito da `DungeonGenerator.buildTilemap()` */
export interface DungeonBuildResult {
  map: Phaser.Tilemaps.Tilemap;
  /** Layer pavimento + muri + porte (usa setCollisionByExclusion) */
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  /** Layer oggetti: scale, forzieri (inizialmente vuoto = -1) */
  stuffLayer: Phaser.Tilemaps.TilemapLayer;
  /** Istanza Dungeon dalla libreria @mikewesthad/dungeon */
  dungeon: Dungeon;
  /** Prima stanza → spawn giocatore */
  startRoom: Room;
  /** Ultima stanza → contiene le scale */
  endRoom: Room;
  /** Altre stanze → forzieri / nemici / oggetti */
  otherRooms: Room[];
  /** Posizione mondo X del centro della startRoom (px) */
  startX: number;
  /** Posizione mondo Y del centro della startRoom (px) */
  startY: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// TEMI DISPONIBILI
// ──────────────────────────────────────────────────────────────────────────────

export const DUNGEON_THEMES: Record<DungeonThemeKey, DungeonTheme> = {
  cyber: {
    key: "cyber",
    label: "Cyber Facility",
    tilesetKey: "tileset-cyber",
    tilesetPath: "tilemaps/home.png",
    bgColor: "#04040f",
  },
  cave: {
    key: "cave",
    label: "Underground Cave",
    tilesetKey: "tileset-cave",
    tilesetPath: "tilemaps/home.png",
    bgColor: "#060402",
  },
  facility: {
    key: "facility",
    label: "Abandoned Facility",
    tilesetKey: "tileset-facility",
    tilesetPath: "tilemaps/home.png",
    bgColor: "#030605",
  },
  void: {
    key: "void",
    label: "The Void",
    tilesetKey: "tileset-void",
    tilesetPath: "tilemaps/home.png",
    bgColor: "#000000",
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// CLASSE PRINCIPALE
// ──────────────────────────────────────────────────────────────────────────────

export class DungeonGenerator {

  /**
   * Genera il dungeon e costruisce tutti i layer Phaser.
   *
   * Architettura identica alla guida di Michael Hadley:
   * - `@mikewesthad/dungeon` → generazione stanze + porte
   * - `createBlankLayer` → groundLayer + stuffLayer
   * - `putTileAt` / `weightedRandomize` / `fill` per dipingere le stanze
   * - `getDoorLocations()` + `putTilesAt` per aprire i passaggi
   * - `setCollisionByExclusion` per le collisioni
   *
   * @param scene Scena Phaser attiva
   * @param config Parametri di configurazione
   * @returns DungeonBuildResult con tutto il necessario per la scena di gioco
   */
  static buildTilemap(
    scene: Phaser.Scene,
    config: DungeonConfig
  ): DungeonBuildResult {

    const { tileSize, theme: themeKey } = config;
    const theme = DUNGEON_THEMES[themeKey] ?? DUNGEON_THEMES.cyber;
    const TILES = DEFAULT_TILES;

    // ── 1. Genera il dungeon con la libreria ─────────────────────────
    // Le stanze hanno dimensioni dispari (onlyOdd: true) così ogni stanza
    // ha un tile centrale esatto — utile per posizionare oggetti e spawn.
    const dungeon = new Dungeon({
      width:       config.width,
      height:      config.height,
      randomSeed:  config.seed,
      doorPadding: config.doorPadding ?? 2,
      rooms: {
        width:    { min: config.rooms.width.min,  max: config.rooms.width.max,  onlyOdd: config.rooms.width.onlyOdd  ?? true },
        height:   { min: config.rooms.height.min, max: config.rooms.height.max, onlyOdd: config.rooms.height.onlyOdd ?? true },
        maxArea:  config.rooms.maxArea,
        maxRooms: config.rooms.maxRooms,
      },
    });

    // ── 2. Scegli texture: home.png reale (preferita) o canvas fallback ─
    // AssetPipeline carica "tileset-{theme.key}" → home.png (672×352, 32×32,
    // 21 colonne × 11 righe, margin=0, spacing=0).
    // Se la texture non è ancora disponibile (es. primo frame prima del preload)
    // si ricade sul canvas colorato con la stessa struttura 21×11.
    const tilesetKey = theme.tilesetKey; // "tileset-cyber" / "tileset-cave" …
    const canvasKey  = `dungeon-canvas-${theme.key}`;
    const activeKey  = scene.textures.exists(tilesetKey) ? tilesetKey : canvasKey;
    if (activeKey === canvasKey && !scene.textures.exists(canvasKey)) {
      const canvas = createCanvasTileset(tileSize, theme.key);
      scene.textures.addCanvas(canvasKey, canvas);
    }

    // ── 3. Crea la Tilemap vuota con dimensioni = dungeon ────────────
    const map = scene.make.tilemap({
      tileWidth:  tileSize,
      tileHeight: tileSize,
      width:  dungeon.width,
      height: dungeon.height,
    });

    // Aggiunge il tileset: home.png → 21×11 tile, nessuna extrusion → margin=0, spacing=0
    const tileset = map.addTilesetImage(activeKey, activeKey, tileSize, tileSize, 0, 0);
    if (!tileset) {
      throw new Error(`[DungeonGenerator] Tileset "${activeKey}" non aggiungibile alla mappa.`);
    }

    // ── 4. Crea i due layer ──────────────────────────────────────────
    const groundLayer = map.createBlankLayer("Ground", tileset)!;
    groundLayer.setDepth(0);

    const stuffLayer = map.createBlankLayer("Stuff", tileset)!;
    stuffLayer.setDepth(1);

    // ── 5. Sfondo: riempi tutto con la tile BLANK (muro scuro) ───────
    groundLayer.fill(TILES.BLANK);

    // ── 6. Dipingi le stanze ─────────────────────────────────────────
    dungeon.rooms.forEach((room) => {
      const { x, y, width, height, left, right, top, bottom } = room;

      // Pavimento interno (escluso il perimetro)
      groundLayer.weightedRandomize(TILES.FLOOR, x + 1, y + 1, width - 2, height - 2);

      // Angoli della stanza
      groundLayer.putTileAt(TILES.WALL.TOP_LEFT,     left,  top);
      groundLayer.putTileAt(TILES.WALL.TOP_RIGHT,    right, top);
      groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);
      groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT,  left,  bottom);

      // Muri perimetrali con varianti casuali (pesate)
      groundLayer.weightedRandomize(TILES.WALL.TOP,    left + 1, top,    width - 2, 1);
      groundLayer.weightedRandomize(TILES.WALL.BOTTOM, left + 1, bottom, width - 2, 1);
      groundLayer.weightedRandomize(TILES.WALL.LEFT,   left,  top + 1,   1, height - 2);
      groundLayer.weightedRandomize(TILES.WALL.RIGHT,  right, top + 1,   1, height - 2);

      // ── Porte ──────────────────────────────────────────────────────
      // Ogni porta ha coordinate relative alla stanza.
      // Il pattern a 3 tile apre un passaggio nel muro:
      //   TOP/BOTTOM:  [arco_sx, pavimento, arco_dx]   → riga orizzontale
      //   LEFT/RIGHT:  [[arco_top],[pavimento],[arco_bot]] → colonna verticale
      const doors = room.getDoorLocations();
      for (const door of doors) {
        if (door.y === 0) {
          groundLayer.putTilesAt(TILES.DOOR.TOP,    x + door.x - 1, y + door.y);
        } else if (door.y === height - 1) {
          groundLayer.putTilesAt(TILES.DOOR.BOTTOM, x + door.x - 1, y + door.y);
        } else if (door.x === 0) {
          groundLayer.putTilesAt(TILES.DOOR.LEFT,   x + door.x, y + door.y - 1);
        } else if (door.x === width - 1) {
          groundLayer.putTilesAt(TILES.DOOR.RIGHT,  x + door.x, y + door.y - 1);
        }
      }
    });

    // ── 7. Collisioni groundLayer ────────────────────────────────────
    // Floor indices (6,7,8,26) e -1 (vuoto) non collidono.
    // Tutto il resto (muri, archi delle porte, angoli) sì.
    groundLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);

    // ── 8. Assegna ruoli alle stanze ─────────────────────────────────
    const allRooms  = dungeon.rooms.slice();
    const startRoom = allRooms.shift()!;                                             // prima stanza
    const endRoom   = Phaser.Utils.Array.RemoveRandomElement(allRooms) as Room;      // stanza finale
    const otherRooms = (Phaser.Utils.Array.Shuffle(allRooms) as Room[])
      .slice(0, Math.floor(allRooms.length * 0.9));

    // ── 9. Scale nella endRoom ───────────────────────────────────────
    stuffLayer.putTileAt(TILES.STAIRS, endRoom.centerX, endRoom.centerY);

    // ── 10. Oggetti nelle otherRooms ─────────────────────────────────
    otherRooms.forEach((room) => {
      const rand = Math.random();
      if (rand <= 0.3) {
        stuffLayer.putTileAt(TILES.CHEST, room.centerX, room.centerY);
      }
    });

    // ── 11. Collisioni stuffLayer ────────────────────────────────────
    stuffLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);

    // ── 12. Posizione di spawn giocatore ─────────────────────────────
    const startX = (map.tileToWorldX(startRoom.centerX) ?? 0) + tileSize / 2;
    const startY = (map.tileToWorldY(startRoom.centerY) ?? 0) + tileSize / 2;

    // ── 13. Limiti camera e mondo fisico ─────────────────────────────
    scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // Il world fisico deve coincidere con la mappa, altrimenti
    // setCollideWorldBounds(true) blocca il player ai bordi dello schermo
    // invece che ai bordi della tilemap.
    scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    return {
      map,
      groundLayer,
      stuffLayer,
      dungeon,
      startRoom,
      endRoom,
      otherRooms,
      startX,
      startY,
    };
  }
}

export default DungeonGenerator;