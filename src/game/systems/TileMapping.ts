// ====================================================================
// TileMapping.ts
// Costanti tile e canvas-tileset fallback per il dungeon procedurale.
//
// Indici basati sul buch-tileset della guida di Michael Hadley:
// https://github.com/mikewesthad/phaser-3-tilemap-blog-posts
//
// home.png: 672×352 px → 21 colonne × 11 righe a 32×32 px = 231 tile
// Formula indice: riga * 21 + colonna  (0-based)
// ====================================================================

// ──────────────────────────────────────────────────────────────────────────────
// TIPI
// ──────────────────────────────────────────────────────────────────────────────

/** Un singolo tile con peso per weightedRandomize */
export interface TileWeight { index: number | number[]; weight: number }

/** Definizione completa del mapping tile del dungeon */
export interface TileMap {
  BLANK: number;
  FLOOR: TileWeight[];
  WALL: {
    TOP_LEFT:     number;
    TOP_RIGHT:    number;
    BOTTOM_RIGHT: number;
    BOTTOM_LEFT:  number;
    TOP:          TileWeight[];
    BOTTOM:       TileWeight[];
    LEFT:         TileWeight[];
    RIGHT:        TileWeight[];
  };
  DOOR: {
    TOP:    number[];         // 3 tile orizzontali: sinistra, centro, destra
    BOTTOM: number[];         // 3 tile orizzontali
    LEFT:   [number[], number[], number[]]; // 3 righe verticali [sx, cx, dx]
    RIGHT:  [number[], number[], number[]];
  };
  STAIRS: number;
  CHEST:  number;
  /** Indici di tile calpestabili (usati in setCollisionByExclusion) */
  FLOOR_INDICES: number[];
}

// ──────────────────────────────────────────────────────────────────────────────
// MAPPING PREDEFINITO (buch-tileset, indici compatibili con home.png 21×11)
// ──────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TILES: TileMap = {
  // Centro del blocco parete (r7c3) → (7-1)*21+(3-1) = 128
  BLANK: 128,

  // Pavimento: colonna 1, riga 3 di home.png → indice (3-1)*21+(1-1) = 42
  FLOOR: [
    { index: 42, weight: 1 },
  ],

  // Blocco pareti home.png: righe 5-9, colonne 1-5 (1-based)
  // Formula 0-based: (riga-1)*21 + (col-1)
  //
  //  r5: 84(vuoto)    85(angolo TL)   86(bordo top)  87(angolo TR)   88(vuoto)
  //  r6: 105(muro L)  106(spigolo TL) 107(faccia top) 108(spigolo TR) 109(muro R)
  //  r7: 126(muro L)  127(int. sx)    128(BLANK)      129(int. dx)    130(muro R)
  //  r8: 147(muro L)  148(int. BL)    149(faccia bot) 150(int. BR)    151(muro R)
  //  r9: 168(vuoto)   169(angolo BL)  170(bordo bot)  171(angolo BR)  172(vuoto)
  WALL: {
    // Angoli riga 5 (cap esterno superiore)
    TOP_LEFT:     85,   // r5c2 — angolo sopra-sinistra
    TOP_RIGHT:    87,   // r5c4 — angolo sopra-destra
    // Angoli riga 9 (cap esterno inferiore) — 168 e 172 sono vuoti
    BOTTOM_LEFT:  169,  // r9c2 — angolo sotto-sinistra
    BOTTOM_RIGHT: 171,  // r9c4 — angolo sotto-destra

    // Bordo superiore: r5c2-c4
    TOP: [
      { index: 86,        weight: 6 },
      { index: [86, 86],  weight: 1 },
    ],
    // Bordo inferiore: r9c2-c4
    BOTTOM: [
      { index: 170,           weight: 4 },
      { index: [170, 170 ],    weight: 1 },
    ],
    // Bordo sinistro: col 1 righe 6-8
    LEFT: [
      { index: 126,          weight: 4 },
      { index: [126, 126],   weight: 1 },
    ],
    // Bordo destro: col 5 righe 6-8
    RIGHT: [
      { index: 130,          weight: 4 },
      { index: [130, 130],   weight: 1 },
    ],
  },

  DOOR: {
    // Porta nella parete superiore: angolo-muro, pavimento, angolo-muro
    // Usare tile reali (85/87) come archi, non le tile vuote (84/88) che colliderebbero
    TOP:    [106, 42, 108],
    // Porta nella parete inferiore: r9 corner + floor + corner
    BOTTOM: [148, 42, 150],
    // Porta nella parete sinistra: [[arco-top],[pavimento],[arco-bot]]
    LEFT:   [[106], [42], [148]],
    // Porta nella parete destra
    RIGHT:  [[108], [42], [150]],
  },

  // Scale per passare al livello successivo
  STAIRS: 81,

  // Forziere
  CHEST: 166,

  // Indici calpestabili (no collisione).
  // Solo le tile visivamente vuote (angoli del blocco 5×5): 84, 88, 168, 172.
  // 169/170/171 sono tile reali del bordo inferiore → hanno collisione.
  // NOTA: 128 (BLANK) NON è qui — il background deve essere solido.
  FLOOR_INDICES: [42, 84, 88, 168, 172],
};

// ──────────────────────────────────────────────────────────────────────────────
// CANVAS TILESET FALLBACK
// Crea un HTMLCanvasElement con la stessa struttura di home.png (21×11 tile)
// ma con colori solidi per ogni categoria.  Usato solo se home.png non è ancora
// disponibile nel cache delle texture di Phaser.
// ──────────────────────────────────────────────────────────────────────────────

/** Numero di colonne in home.png (672 / 32 = 21) */
const COLS = 21;
/** Numero di righe in home.png (352 / 32 = 11) */
const ROWS = 11;

/** Palette colori per categoria di tile (una per tema) */
const THEME_PALETTES: Record<string, {
  blank: string; floor: string; wallTop: string; wallSide: string;
  door: string; stairs: string; chest: string;
}> = {
  cyber: {
    blank:    "#04040f",
    floor:    "#1a1a3e",
    wallTop:  "#0088cc",
    wallSide: "#005588",
    door:     "#00ffcc",
    stairs:   "#ffcc00",
    chest:    "#ff6600",
  },
  cave: {
    blank:    "#060402",
    floor:    "#2a1a0e",
    wallTop:  "#6b4226",
    wallSide: "#4a2c18",
    door:     "#c8a96e",
    stairs:   "#ffe066",
    chest:    "#cc8833",
  },
  facility: {
    blank:    "#030605",
    floor:    "#0a1a0a",
    wallTop:  "#144a14",
    wallSide: "#0c330c",
    door:     "#44ff44",
    stairs:   "#88ff88",
    chest:    "#ffaa00",
  },
  void: {
    blank:    "#000000",
    floor:    "#0d0d0d",
    wallTop:  "#330033",
    wallSide: "#220022",
    door:     "#cc00cc",
    stairs:   "#ff00ff",
    chest:    "#ffff00",
  },
};

/**
 * Restituisce il colore di sfondo da usare per l'indice tile dato.
 * Mappa i principali indici del DEFAULT_TILES a colori semantici.
 */
function colorForIndex(idx: number, palette: typeof THEME_PALETTES[string]): string {
  // Floor (r3c1 → idx 42)
  if (idx === 42) return palette.floor;
  // Tile vuote (4 angoli del blocco 5×5): 84, 88, 168, 172
  if ([84, 88, 168, 172].includes(idx)) return palette.blank;
  // Bordi parete superiori (r5) e inferiori (r9): angoli + cap orizzontali
  if ([85, 86, 87, 169, 170, 171].includes(idx)) return palette.wallTop;
  // Bordi parete laterali (col 1 e col 5, r6-r8)
  if ([105, 126, 148, 109, 130, 150].includes(idx)) return palette.wallSide;
  // Pareti interne (3×3 interni del blocco 5×5)
  if ([106, 107, 108, 127, 128, 129, 148, 149, 150].includes(idx)) return palette.wallSide;
  // Scale
  if (idx === 81) return palette.stairs;
  // Forziere
  if (idx === 166) return palette.chest;
  // Blank (default)
  return palette.blank;
}

/**
 * Crea un canvas colorato (21×11 tile) che replica la struttura di home.png.
 * Ogni tile viene riempito con il colore della sua categoria semantica.
 *
 * @param tileSize  Dimensione in px di ogni tile (tipicamente 32)
 * @param themeKey  Chiave tema per la palette colori
 */
export function createCanvasTileset(tileSize: number, themeKey: string): HTMLCanvasElement {
  const palette = THEME_PALETTES[themeKey] ?? THEME_PALETTES["cyber"];

  const canvas = document.createElement("canvas");
  canvas.width  = COLS * tileSize;  // 21 * 32 = 672 px
  canvas.height = ROWS * tileSize;  // 11 * 32 = 352 px

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col;
      ctx.fillStyle = colorForIndex(idx, palette);
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);

      // Bordo sottile per distinguere i tile in modalità debug
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(col * tileSize + 0.25, row * tileSize + 0.25, tileSize - 0.5, tileSize - 0.5);
    }
  }

  return canvas;
}
