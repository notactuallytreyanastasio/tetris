// Core constants: playfield dimensions, tetromino geometry, SRS wall-kick
// tables, scoring and gravity. Pure data. Coordinates: `row` grows downward,
// `col` grows rightward.

import type { PieceKind, RotationIndex } from "./types.ts";
import type { Cell } from "./types.ts";

/** Playfield size. All 20 rows are visible; the top row is a solid wall, so
 * nothing may occupy row < 0. */
export const COLS = 10;
export const ROWS = 20;

/** Bounding-box edge length per kind, used for SRS rotation and kicks. */
export const BOUNDING_SIZE: Readonly<Record<PieceKind, number>> = {
  I: 4,
  O: 2,
  J: 3,
  L: 3,
  S: 3,
  T: 3,
  Z: 3,
};

/** Occupied cells in the spawn orientation (rotation index 0), expressed in
 * bounding-box coordinates. Every other orientation is derived by rotation. */
export const BASE_CELLS: Readonly<Record<PieceKind, readonly Cell[]>> = {
  I: [
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
  ],
  J: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
  L: [
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
  O: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],
  S: [
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],
  T: [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
  Z: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
};

/** The seven kinds, in fixed order, for bag construction. */
export const KINDS: readonly PieceKind[] = [
  "I",
  "J",
  "L",
  "O",
  "S",
  "T",
  "Z",
];

/**
 * SRS wall-kick offsets. Keyed by `${from}>${to}` rotation transitions.
 * Offsets are written in the canonical SRS convention where a positive y is
 * *upward*; `rotation.ts` negates them because our `row` grows downward.
 */
export const KICKS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  // J, L, S, T, Z (3x3 box)
  "0>1": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "1>0": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "1>2": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  "2>1": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "2>3": [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  "3>2": [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  "3>0": [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  "0>3": [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  // I (4x4 box)
  "I:0>1": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "I:1>0": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "I:1>2": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
  "I:2>1": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "I:2>3": [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, 1],
    [-1, -2],
  ],
  "I:3>2": [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, -1],
    [1, 2],
  ],
  "I:3>0": [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, -2],
    [-2, 1],
  ],
  "I:0>3": [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, 2],
    [2, -1],
  ],
};

/** Points awarded for clearing 0..4 lines, multiplied by the current level. */
export const LINE_SCORE: Readonly<Record<number, number>> = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

/** Points per cell of manual drop: soft and hard respectively. */
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

/** Lines required per level step. */
export const LINES_PER_LEVEL = 10;

/** Gravity delay in ms per row, a pure function of level (Tetris Worlds
 * curve, clamped so the game stays playable and never hits 0 ms). */
export function gravityDelayMs(level: number): number {
  const clamped = Math.max(1, Math.min(20, level));
  const seconds = Math.pow(0.8 - (clamped - 1) * 0.005, clamped - 1);
  return Math.max(25, Math.floor(seconds * 1000));
}

/** Spawn bounding-box left column: centred for the given bounding size. */
export function spawnCol(size: number): number {
  return Math.floor((COLS - size) / 2);
}
