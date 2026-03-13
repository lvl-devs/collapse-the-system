/**
 * DungeonGenerator: Refactored fully JSON-based generator.
 * Eliminating procedural generation from @mikewesthad/dungeon.
 */

import Phaser from "phaser";
import { DEFAULT_TILES, createCanvasTileset } from "./TileMapping";

export type DungeonThemeKey = "cyber" | "cave" | "facility" | "void";
export type DungeonRoomRole = "start" | "end" | "other" | string;
export type DungeonWallSide = "top" | "bottom" | "left" | "right";

export interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  role: DungeonRoomRole;
  getDoorLocations: () => { x: number; y: number }[];
}

export interface DungeonTheme {
  key: DungeonThemeKey;
  label: string;
  tilesetKey: string;
  tilesetPath: string;
  bgColor: string;
}

export interface OverlayRule {
  id: string;
  tilesets: string | string[];
  onTiles: number[];
  chance: number;
  alternate?: boolean;
  frameMapping?: Record<number, number>;
  tileOffset?: { x: number; y: number };
  tileHeight?: number;
  roomIds?: string[];
  collision?: boolean;
}

export interface DungeonConfig {
  width: number;
  height: number;
  tileSize: number;
  theme: DungeonThemeKey;
  fixedRooms?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    role?: DungeonRoomRole;
  }>;
  fixedCorridors?: Array<{
    from: string;
    to: string;
    type: "horizontal" | "vertical";
  }>;
  doors?: {
    placement?: "corridorEntrances" | "none";
    centralTileset?: string;
    sideTileset?: string;
    tileWidth?: number;
    tileHeight?: number;
    tileOffset?: { x?: number; y: number };
  };
  overlayRules?: OverlayRule[];
  placement?: {
    stairs?: {
      tileIndex?: number;
      roomRole?: DungeonRoomRole;
    };
    objects?: Array<{
      id: string;
      tileIndex: number;
      tileIndexByWall?: Partial<Record<DungeonWallSide, number>>;
      tileVariants?: Array<{
        base: number;
        byWall?: Partial<Record<DungeonWallSide, number>>;
      }>;
      multiTile?: {
        tiles: number[];
        orientation?: "horizontal" | "vertical" | "auto";
      };
      roomRoles?: DungeonRoomRole[];
      roomIds?: string[];
      chancePerRoom?: number;
      minCount?: number;
      maxCount?: number;
      avoidOccupiedRooms?: boolean;
      avoidOccupiedTiles?: boolean;
      countPerRoom?: {
        min?: number;
        max?: number;
      };
      position?: {
        mode?: "center" | "randomFloor" | "wallAttached";
        paddingFromWalls?: number;
        avoidCenter?: boolean;
        wallSides?: DungeonWallSide[];
      };
    }>;
  };
}

export interface DungeonBuildResult {
  map: Phaser.Tilemaps.Tilemap;
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  stuffLayer: Phaser.Tilemaps.TilemapLayer;
  doorLayer: Phaser.Tilemaps.TilemapLayer;
  dungeon: {
    width: number;
    height: number;
    rooms: Room[];
  };
  startRoom: Room;
  endRoom: Room;
  otherRooms: Room[];
  startX: number;
  startY: number;
}

export const DUNGEON_THEMES: Record<DungeonThemeKey, DungeonTheme> = {
  cyber: { key: "cyber", label: "Cyber Facility", tilesetKey: "tileset-cyber", tilesetPath: "tilemaps/home.png", bgColor: "#04040f" },
  cave: { key: "cave", label: "Underground Cave", tilesetKey: "tileset-cave", tilesetPath: "tilemaps/home.png", bgColor: "#060402" },
  facility: { key: "facility", label: "Abandoned Facility", tilesetKey: "tileset-facility", tilesetPath: "tilemaps/home.png", bgColor: "#030605" },
  void: { key: "void", label: "The Void", tilesetKey: "tileset-void", tilesetPath: "tilemaps/home.png", bgColor: "#000000" },
};

export class DungeonGenerator {
  static buildTilemap(scene: Phaser.Scene, config: DungeonConfig): DungeonBuildResult {
    const { tileSize, theme: themeKey } = config;
    const theme = DUNGEON_THEMES[themeKey] ?? DUNGEON_THEMES.cyber;
    const TILES = DEFAULT_TILES;

    // Convert fixedRooms to Room interface
    const rooms: Room[] = (config.fixedRooms || []).map(fr => ({
      id: fr.id,
      x: fr.x,
      y: fr.y,
      width: fr.width,
      height: fr.height,
      left: fr.x,
      right: fr.x + fr.width - 1,
      top: fr.y,
      bottom: fr.y + fr.height - 1,
      centerX: Math.floor(fr.x + fr.width / 2),
      centerY: Math.floor(fr.y + fr.height / 2),
      role: fr.role || "other",
      getDoorLocations: () => [] 
    }));

    const dungeon = {
      width: config.width,
      height: config.height,
      rooms
    };

    const tilesetKey = theme.tilesetKey;
    const canvasKey = `dungeon-canvas-${theme.key}`;
    const activeKey = scene.textures.exists(tilesetKey) ? tilesetKey : canvasKey;
    if (activeKey === canvasKey && !scene.textures.exists(canvasKey)) {
      scene.textures.addCanvas(canvasKey, createCanvasTileset(tileSize, theme.key));
    }

    const map = scene.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: dungeon.width,
      height: dungeon.height,
    });

    const tileset = map.addTilesetImage(activeKey, activeKey, tileSize, tileSize, 0, 0);
    if (!tileset) throw new Error(`[DungeonGenerator] Tileset "${activeKey}" not available.`);

    const overlayTilesets: Record<string, Phaser.Tilemaps.Tileset> = {};
    const ensureOverlayTileset = (tsKey: string, tileHeight: number, tileOffset?: { x?: number; y: number }, tileWidth?: number): void => {
      if (overlayTilesets[tsKey]) return;
      const ts = map.addTilesetImage(tsKey, tsKey, tileWidth ?? tileSize, tileHeight, 0, 0);
      if (!ts) return;
      overlayTilesets[tsKey] = ts;
      if (tileOffset) {
        ts.tileOffset.y = tileOffset.y;
        ts.tileOffset.x = tileOffset.x || 0;
      }
    };

    if (config.overlayRules) {
      config.overlayRules.forEach(rule => {
        const tsKeys = Array.isArray(rule.tilesets) ? rule.tilesets : [rule.tilesets];
        tsKeys.forEach(tsKey => {
          ensureOverlayTileset(tsKey, rule.tileHeight || tileSize, rule.tileOffset);
        });
      });
    }

    const centralDoorTilesetKey = config.doors?.centralTileset || "door-closed";
    const sideDoorTilesetKey = config.doors?.sideTileset || "door";
    const doorTileWidth = config.doors?.tileWidth ?? tileSize;
    const doorTileHeight = config.doors?.tileHeight || tileSize * 2;
    const doorTileOffset = config.doors?.tileOffset || { x: 0, y: 0 };

    if (config.doors?.placement !== "none") {
      ensureOverlayTileset(centralDoorTilesetKey, doorTileHeight, doorTileOffset, doorTileWidth);
      ensureOverlayTileset(sideDoorTilesetKey, doorTileHeight, doorTileOffset, doorTileWidth);
    }

    const validOverlayTilesets = Object.values(overlayTilesets).filter(t => t !== null) as Phaser.Tilemaps.Tileset[];
    const doorOverlayKeys = new Set([centralDoorTilesetKey, sideDoorTilesetKey]);
    const objectOverlayTilesets = validOverlayTilesets.filter(ts => !doorOverlayKeys.has(ts.name));
    const doorLayerOverlayTilesets = validOverlayTilesets.filter(ts => doorOverlayKeys.has(ts.name));

    const groundLayer = map.createBlankLayer("Ground", tileset)!.setDepth(0);
    const stuffLayer = map.createBlankLayer("Stuff", [tileset, ...objectOverlayTilesets])!.setDepth(1);
    const doorLayerTilesets = [tileset, ...doorLayerOverlayTilesets];
    const doorLayer = map.createBlankLayer("Doors", doorLayerTilesets)!.setDepth(2);
    
    // Fill background with blank
    groundLayer.fill(TILES.BLANK);

    // 1. Paint Rooms
    rooms.forEach((room) => {
      const { left, right, top, bottom, width, height } = room;

      groundLayer.weightedRandomize(TILES.FLOOR, left + 1, top + 2, width - 2, height - 3);

      groundLayer.weightedRandomize(TILES.WALL.TOP, left + 1, top, width - 2, 1);
      groundLayer.weightedRandomize(TILES.WALL.TOP_BODY, left + 1, top + 1, width - 2, 1);
      groundLayer.weightedRandomize(TILES.WALL.BOTTOM, left + 1, bottom, width - 2, 1);
      groundLayer.weightedRandomize(TILES.WALL.LEFT, left, top + 2, 1, height - 3);
      groundLayer.weightedRandomize(TILES.WALL.RIGHT, right, top + 2, 1, height - 3);

      groundLayer.putTileAt(TILES.WALL.TOP_LEFT, left, top);
      groundLayer.putTileAt(TILES.WALL.TOP_RIGHT, right, top);
      groundLayer.putTileAt(TILES.WALL.TOP_LEFT_BODY, left, top + 1);
      groundLayer.putTileAt(TILES.WALL.TOP_RIGHT_BODY, right, top + 1);
      groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT, left, bottom);
      groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);

      const capY = top - 1;
      if (capY >= 0) {
        groundLayer.putTileAt(TILES.TOP_CAP.LEFT_CORNER, left, capY);
        groundLayer.putTileAt(TILES.TOP_CAP.RIGHT_CORNER, right, capY);
        groundLayer.weightedRandomize(TILES.TOP_CAP.CENTER, left + 1, capY, width - 2, 1);
      }
    });

    const blockedDoorTiles = new Set<string>();
    const markBlocked = (tx: number, ty: number) => {
      blockedDoorTiles.add(`${tx},${ty}`);
    };

    // 2. Clear blockages and paint corridors
    const leftWallIdx = TILES.WALL.LEFT[0].index as number;
    const rightWallIdx = TILES.WALL.RIGHT[0].index as number;
    const bottomIdx = TILES.WALL.BOTTOM[0].index as number;

    const clearPassage = (tx: number, ty: number, w: number, h: number) => {
      groundLayer.weightedRandomize(TILES.FLOOR, tx, ty, w, h);
    };

    if (config.fixedCorridors) {
      config.fixedCorridors.forEach(corr => {
        const fromRoom = rooms.find(r => r.id === corr.from);
        const toRoom = rooms.find(r => r.id === corr.to);
        if (!fromRoom || !toRoom) return;

        if (corr.type === "horizontal") {
          const corridorY = Math.floor((fromRoom.y + fromRoom.height / 2 + toRoom.y + toRoom.height / 2) / 2);
          const corridorXStart = fromRoom.x < toRoom.x ? fromRoom.x + fromRoom.width : toRoom.x + toRoom.width;
          const corridorXEnd = fromRoom.x < toRoom.x ? toRoom.x : fromRoom.x;

          for (let tx = corridorXStart; tx < corridorXEnd; tx++) {
            groundLayer.weightedRandomize(TILES.FLOOR, tx, corridorY, 1, 2);
            groundLayer.putTileAt(128, tx, corridorY - 3); // space above cap
            groundLayer.putTileAt(128, tx, corridorY - 2); // wall cap erased
            groundLayer.putTileAt(86, tx, corridorY - 1);  // top wall
            groundLayer.putTileAt(bottomIdx, tx, corridorY + 2); // bottom wall
          }
          
          clearPassage(corridorXStart - 1, corridorY, 2, 2);
          clearPassage(corridorXEnd - 1, corridorY, 2, 2);

          // T-junction / corridor intersections
          // Left side
          groundLayer.putTileAt(108, corridorXStart - 1, corridorY - 1); // inner top-right curve
          groundLayer.putTileAt(150, corridorXStart - 1, corridorY + 2); // inner bottom-right curve
          
          // Right side
          groundLayer.putTileAt(106, corridorXEnd, corridorY - 1); // inner top-left curve
          groundLayer.putTileAt(148, corridorXEnd, corridorY + 2); // inner bottom-left curve

          // Fixup room walls
          groundLayer.putTileAt(130, corridorXStart - 1, corridorY - 2); // left wall above opening
          groundLayer.putTileAt(126, corridorXEnd, corridorY - 2); // right wall above opening

          // Blocked door spots for object placement protection
          markBlocked(corridorXStart - 1, corridorY);
          markBlocked(corridorXStart - 1, corridorY + 1);
          markBlocked(corridorXEnd, corridorY);
          markBlocked(corridorXEnd, corridorY + 1);
          
        } else if (corr.type === "vertical") {
          const corridorX = Math.floor((fromRoom.x + fromRoom.width / 2 + toRoom.x + toRoom.width / 2) / 2);
          const corridorYStart = fromRoom.y < toRoom.y ? fromRoom.y + fromRoom.height : toRoom.y + toRoom.height;
          const corridorYEnd = fromRoom.y < toRoom.y ? toRoom.y : fromRoom.y;

          for (let ty = corridorYStart; ty < corridorYEnd; ty++) {
            groundLayer.weightedRandomize(TILES.FLOOR, corridorX, ty, 2, 1);
            groundLayer.putTileAt(leftWallIdx, corridorX - 1, ty);
            groundLayer.putTileAt(rightWallIdx, corridorX + 2, ty);
          }
          
          clearPassage(corridorX, corridorYStart - 1, 2, 2); // Entrance at bottom of upper room
          clearPassage(corridorX, corridorYEnd - 1, 2, 3);   // Entrance at top of lower room

          // Top room junction
          groundLayer.putTileAt(148, corridorX - 1, corridorYStart - 1); // inner bottom-left
          groundLayer.putTileAt(150, corridorX + 2, corridorYStart - 1); // inner bottom-right
          groundLayer.putTileAt(126, corridorX - 1, corridorYStart); // continue left wall down
          groundLayer.putTileAt(130, corridorX + 2, corridorYStart); // continue right wall down

          // Bottom room junction
          groundLayer.putTileAt(106, corridorX - 1, corridorYEnd - 1); // inner top-left
          groundLayer.putTileAt(108, corridorX + 2, corridorYEnd - 1); // inner top-right
          groundLayer.putTileAt(2, corridorX - 1, corridorYEnd); // top wall cap
          groundLayer.putTileAt(2, corridorX + 2, corridorYEnd); // top wall cap

          // Blocked door spots for object placement protection
          markBlocked(corridorX, corridorYStart - 1);
          markBlocked(corridorX + 1, corridorYStart - 1);
          markBlocked(corridorX, corridorYEnd - 1);
          markBlocked(corridorX + 1, corridorYEnd - 1);
          markBlocked(corridorX, corridorYEnd);
          markBlocked(corridorX + 1, corridorYEnd);
        }
      });
    }

    groundLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);

    let startRoom: Room | undefined;
    let endRoom: Room | undefined;
    
    startRoom = rooms.find(r => r.role === "start") || rooms[0];
    endRoom = rooms.find(r => r.role === "end") || rooms[rooms.length - 1];
    const otherRooms = rooms.filter(r => r.role !== "start" && r.role !== "end");

    if (!startRoom || !endRoom) throw new Error("No rooms available in JSON for start/end.");

    const getRoomsByRole = (role: DungeonRoomRole): Room[] => {
      if (role === "start") return [startRoom!];
      if (role === "end") return [endRoom!];
      return otherRooms;
    };

    const roomKey = (room: Room): string => `${room.centerX},${room.centerY}`;
    const tileKey = (x: number, y: number): string => `${x},${y}`;
    const occupiedRooms = new Set<string>();
    const occupiedTiles = new Set<string>();

    const objectRules = config.placement?.objects ?? [];

    for (const rule of objectRules) {
      const roles = rule.roomRoles && rule.roomRoles.length > 0 ? rule.roomRoles : (["other"] as DungeonRoomRole[]);
      let candidateRooms: Room[] = [];
      
      if (rule.roomIds && rule.roomIds.length > 0) {
        rule.roomIds.forEach(roomId => {
          const room = rooms.find((r) => r.id === roomId);
          if (room) candidateRooms.push(room);
        });
      } else {
        candidateRooms = roles.flatMap((role) => getRoomsByRole(role));
      }

      candidateRooms = Phaser.Utils.Array.Shuffle(candidateRooms) as Room[];

      const maxCount = Math.max(0, rule.maxCount ?? Number.MAX_SAFE_INTEGER);
      const minCount = Math.max(0, rule.minCount ?? 0);
      const chance = Phaser.Math.Clamp(rule.chancePerRoom ?? 1, 0, 1);
      const avoidOccupied = rule.avoidOccupiedRooms ?? true;
      const avoidOccupiedTiles = rule.avoidOccupiedTiles ?? true;
      const minPerRoom = Math.max(1, rule.countPerRoom?.min ?? 1);
      const maxPerRoom = Math.max(minPerRoom, rule.countPerRoom?.max ?? minPerRoom);
      const position = {
        mode: rule.position?.mode ?? "center",
        paddingFromWalls: rule.position?.paddingFromWalls ?? 1,
        avoidCenter: rule.position?.avoidCenter ?? false,
        wallSides: (rule.position?.wallSides && rule.position.wallSides.length > 0)
          ? rule.position.wallSides
          : (["top", "bottom", "left", "right"] as DungeonWallSide[]),
      };

      const tryPlaceInRoom = (room: Room, skipChance: boolean): number => {
        if (placed >= maxCount) return 0;
        if (avoidOccupied && occupiedRooms.has(roomKey(room))) return 0;
        if (!skipChance && Math.random() > chance) return 0;

        const requested = Phaser.Math.Between(minPerRoom, maxPerRoom);
        const slots = this.pickRoomPlacementTiles(room, requested, position, occupiedTiles, avoidOccupiedTiles, blockedDoorTiles);
        if (slots.length === 0) return 0;

        let placedInRoom = 0;
        for (const slot of slots) {
          if (placed >= maxCount) break;

          if (rule.multiTile && rule.multiTile.tiles.length > 0) {
            const orientation = rule.multiTile.orientation ?? "auto";
            const isHorizontal = orientation === "horizontal" || (orientation === "auto" && (slot.wallSide === "top" || slot.wallSide === "bottom"));
            const tiles = rule.multiTile.tiles;

            let allTilesValid = true;
            const cellsToPlace: Array<{ x: number, y: number, tile: number }> = [];

            for (let i = 0; i < tiles.length; i++) {
              const tx = isHorizontal ? slot.x + i : slot.x;
              const ty = isHorizontal ? slot.y : slot.y + i;
              const key = tileKey(tx, ty);

              if (tx < 0 || ty < 0 || tx >= dungeon.width || ty >= dungeon.height) {
                allTilesValid = false;
                break;
              }
              if (avoidOccupiedTiles && occupiedTiles.has(key)) {
                allTilesValid = false;
                break;
              }
              if (blockedDoorTiles.has(key)) {
                allTilesValid = false;
                break;
              }
              cellsToPlace.push({ x: tx, y: ty, tile: tiles[i] });
            }

            if (!allTilesValid) continue;

            for (const cell of cellsToPlace) {
              stuffLayer.putTileAt(cell.tile, cell.x, cell.y);
              if (avoidOccupiedTiles) occupiedTiles.add(tileKey(cell.x, cell.y));
            }
          } else {
            let tileForSlot = rule.tileIndex;
            if (rule.tileVariants && rule.tileVariants.length > 0) {
              const variant = Phaser.Utils.Array.GetRandom(rule.tileVariants);
              tileForSlot = slot.wallSide != null
                ? (variant.byWall?.[slot.wallSide] ?? variant.base)
                : variant.base;
            } else {
              tileForSlot = slot.wallSide != null
                ? (rule.tileIndexByWall?.[slot.wallSide] ?? rule.tileIndex)
                : rule.tileIndex;
            }

            stuffLayer.putTileAt(tileForSlot, slot.x, slot.y);
            if (avoidOccupiedTiles) occupiedTiles.add(tileKey(slot.x, slot.y));
          }

          placed++;
          placedInRoom++;
        }

        if (placedInRoom > 0 && avoidOccupied) {
          occupiedRooms.add(roomKey(room));
        }

        return placedInRoom;
      };

      let placed = 0;
      for (const room of candidateRooms) {
        if (placed >= maxCount) break;
        tryPlaceInRoom(room, false);
      }

      if (placed < minCount) {
        for (const room of candidateRooms) {
          if (placed >= minCount || placed >= maxCount) break;
          tryPlaceInRoom(room, true);
        }
      }
    }
    
    // Explicit stairs placement if any
    if (config.placement?.stairs) {
         const stairsRole = config.placement.stairs.roomRole || "end";
         const stairsRoom = getRoomsByRole(stairsRole)[0];
         if (stairsRoom) {
             const cx = stairsRoom.centerX;
             const cy = stairsRoom.centerY;
             const stairsIndex = config.placement.stairs.tileIndex ?? 124; // DEFAULT_TILES.STAIRS
             stuffLayer.putTileAt(stairsIndex, cx, cy);
         }
    }

    stuffLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);

    const nonCollidingIndices = this.applyOverlayRules(config, rooms, groundLayer, stuffLayer, overlayTilesets);
    this.applyDoorOverlays(config, rooms, doorLayer, overlayTilesets);

    const startX = (map.tileToWorldX(startRoom.centerX) ?? 0) + tileSize / 2;
    const startY = (map.tileToWorldY(startRoom.centerY) ?? 0) + tileSize / 2;

    scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    scene.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    stuffLayer.setCollisionByExclusion([-1, ...TILES.FLOOR_INDICES]);
    nonCollidingIndices.forEach(idx => stuffLayer.setCollision(idx, false));

    return { map, groundLayer, stuffLayer, doorLayer, dungeon, startRoom, endRoom, otherRooms, startX, startY };
  }

  private static applyOverlayRules(
    config: DungeonConfig,
    rooms: Room[],
    groundLayer: Phaser.Tilemaps.TilemapLayer,
    stuffLayer: Phaser.Tilemaps.TilemapLayer,
    overlayTilesets: Record<string, Phaser.Tilemaps.Tileset>
  ): Set<number> {
    const nonCollidingIndices = new Set<number>();
    if (!config.overlayRules || config.overlayRules.length === 0) return nonCollidingIndices;

    const ruleState = config.overlayRules.map(() => ({ alternateIndex: 0 }));

    const applyOverlay = (tile: Phaser.Tilemaps.Tile, rule: any, idx: number) => {
      if (rule.onTiles.includes(tile.index)) {
        const existing = stuffLayer.getTileAt(tile.x, tile.y);
        if (existing && existing.index !== -1) return;

        if (Phaser.Math.Between(0, 100) < rule.chance) {
          const state = ruleState[idx];
          const tsKeys = Array.isArray(rule.tilesets) ? rule.tilesets : [rule.tilesets];
          const tsKey = rule.alternate
            ? tsKeys[state.alternateIndex % tsKeys.length]
            : Phaser.Utils.Array.GetRandom(tsKeys);

          if (rule.alternate) state.alternateIndex++;

          const ts = overlayTilesets[tsKey];
          if (ts) {
            let frameOffset = 0;
            if (rule.frameMapping) {
              const mapped = rule.frameMapping[tile.index];
              if (mapped !== undefined) frameOffset = mapped;
            }
            const overlayTile = stuffLayer.putTileAt(ts.firstgid + frameOffset, tile.x, tile.y);
            
            if (rule.collision === false) {
               nonCollidingIndices.add(ts.firstgid + frameOffset);
            }
          }
        }
      }
    };

    config.overlayRules.forEach((rule, idx) => {
      if (rule.roomIds && rule.roomIds.length > 0) {
        rule.roomIds.forEach(roomId => {
          const roomConfig = rooms.find(r => r.id === roomId);
          if (roomConfig) {
            groundLayer.forEachTile((tile) => {
              applyOverlay(tile, rule, idx);
            }, undefined, roomConfig.x, roomConfig.y, roomConfig.width, roomConfig.height);
          }
        });
      } else {
        groundLayer.forEachTile((tile) => {
          applyOverlay(tile, rule, idx);
        });
      }
    });

    return nonCollidingIndices;
  }

  private static applyDoorOverlays(
    config: DungeonConfig,
    rooms: Room[],
    doorLayer: Phaser.Tilemaps.TilemapLayer,
    overlayTilesets: Record<string, Phaser.Tilemaps.Tileset>
  ): void {
    const centralDoorTilesetKey = config.doors?.centralTileset || "door-closed";
    const sideDoorTilesetKey = config.doors?.sideTileset || "door";
    const centralDoorTs = overlayTilesets[centralDoorTilesetKey];
    const sideDoorTs = overlayTilesets[sideDoorTilesetKey];
    if (!centralDoorTs && !sideDoorTs) return;

    if (config.doors?.placement !== "corridorEntrances") return;

    const centerRoom = rooms.find(r => r.id === "center") || rooms.find(r => r.role === "start");
    const centerX = centerRoom ? centerRoom.x + centerRoom.width / 2 : 0;
    const centerY = centerRoom ? centerRoom.y + centerRoom.height / 2 : 0;

    const pickDoorTilesetForRoom = (room: Room): Phaser.Tilemaps.Tileset | undefined => {
      if (centerRoom && room.id === centerRoom.id) return centralDoorTs || sideDoorTs;
      if (centerRoom) {
        const roomCenterX = room.x + room.width / 2;
        const roomCenterY = room.y + room.height / 2;
        const dx = Math.abs(roomCenterX - centerX);
        const dy = Math.abs(roomCenterY - centerY);
        if (dx > dy) return sideDoorTs || centralDoorTs;
      }
      return centralDoorTs || sideDoorTs;
    };

    if (config.fixedCorridors) {
      config.fixedCorridors.forEach(corr => {
        const fromRoom = rooms.find(r => r.id === corr.from);
        const toRoom = rooms.find(r => r.id === corr.to);
        if (!fromRoom || !toRoom) return;

        if (corr.type === "horizontal") {
          const corridorY = Math.floor((fromRoom.y + fromRoom.height / 2 + toRoom.y + toRoom.height / 2) / 2);
          const fromOnLeft = fromRoom.x < toRoom.x;
          const leftRoom = fromOnLeft ? fromRoom : toRoom;
          const rightRoom = fromOnLeft ? toRoom : fromRoom;

          const leftDoorX = leftRoom.x + leftRoom.width - 1;
          const rightDoorX = rightRoom.x;
          const leftDoorTs = pickDoorTilesetForRoom(leftRoom);
          const rightDoorTs = pickDoorTilesetForRoom(rightRoom);
          if (leftDoorTs) doorLayer.putTileAt(leftDoorTs.firstgid, leftDoorX, corridorY - 1); // Note: shifted -1 correctly places the door visually over opening
          if (rightDoorTs) doorLayer.putTileAt(rightDoorTs.firstgid, rightDoorX, corridorY - 1);

        } else if (corr.type === "vertical") {
          const corridorX = Math.floor((fromRoom.x + fromRoom.width / 2 + toRoom.x + toRoom.width / 2) / 2);
          const fromOnTop = fromRoom.y < toRoom.y;
          const topRoom = fromOnTop ? fromRoom : toRoom;
          const bottomRoom = fromOnTop ? toRoom : fromRoom;

          const topDoorY = topRoom.y + topRoom.height - 1;
          const bottomDoorY = bottomRoom.y;
          const topDoorTs = pickDoorTilesetForRoom(topRoom);
          const bottomDoorTs = pickDoorTilesetForRoom(bottomRoom);
          
          if (topDoorTs) doorLayer.putTileAt(topDoorTs.firstgid, corridorX, topDoorY - 1);
          if (bottomDoorTs) doorLayer.putTileAt(bottomDoorTs.firstgid, corridorX, bottomDoorY - 1);
        }
      });
    }
  }

  private static pickRoomPlacementTiles(
    room: Room,
    requestedCount: number,
    position: {
      mode: "center" | "randomFloor" | "wallAttached";
      paddingFromWalls: number;
      avoidCenter: boolean;
      wallSides: DungeonWallSide[];
    },
    occupiedTiles: Set<string>,
    avoidOccupiedTiles: boolean,
    blockedDoorTiles: Set<string>
  ): Array<{ x: number; y: number; wallSide?: DungeonWallSide }> {
    const toKey = (x: number, y: number): string => `${x},${y}`;

    if (position.mode === "center") {
      const center = { x: room.centerX, y: room.centerY };
      if (avoidOccupiedTiles && occupiedTiles.has(toKey(center.x, center.y))) {
        return [];
      }
      return [center];
    }

    const wallPadding = Math.max(1, Math.floor(position.paddingFromWalls));
    let minX = room.x + wallPadding;
    let maxX = room.x + room.width - 1 - wallPadding;
    let minY = room.y + Math.max(wallPadding, 2);
    let maxY = room.y + room.height - 1 - wallPadding;

    if (minX > maxX || minY > maxY) {
      minX = room.x + 1;
      maxX = room.x + room.width - 2;
      minY = room.y + 1;
      maxY = room.y + room.height - 2;
    }

    const candidates: Array<{ x: number; y: number; wallSide?: DungeonWallSide }> = [];

    if (position.mode === "wallAttached") {
      for (const side of position.wallSides) {
        if (side === "top") {
          const y = minY;
          for (let x = minX; x <= maxX; x++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "top" });
          }
        } else if (side === "bottom") {
          const y = maxY;
          for (let x = minX; x <= maxX; x++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "bottom" });
          }
        } else if (side === "left") {
          const x = minX;
          for (let y = minY; y <= maxY; y++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "left" });
          }
        } else if (side === "right") {
          const x = maxX;
          for (let y = minY; y <= maxY; y++) {
            if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
            candidates.push({ x, y, wallSide: "right" });
          }
        }
      }
    } else {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (position.avoidCenter && x === room.centerX && y === room.centerY) continue;
          candidates.push({ x, y });
        }
      }
    }

    const shuffled = Phaser.Utils.Array.Shuffle(candidates) as Array<{ x: number; y: number; wallSide?: DungeonWallSide }>;
    const result: Array<{ x: number; y: number; wallSide?: DungeonWallSide }> = [];

    for (const cell of shuffled) {
      if (result.length >= requestedCount) break;
      if (blockedDoorTiles.has(toKey(cell.x, cell.y))) continue;
      if (avoidOccupiedTiles && occupiedTiles.has(toKey(cell.x, cell.y))) continue;
      
      result.push(cell);
    }

    return result;
  }
}

export default DungeonGenerator;
