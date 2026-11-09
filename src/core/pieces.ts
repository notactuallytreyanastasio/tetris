// Tetromino geometry: rotation states derived by rotating the spawn shape
// inside its bounding box, plus spawn placement. Pure; cached on import.

import type { ActivePiece, Cell, PieceKind, RotationIndex } from "./types.ts";
import { BASE_CELLS, BOUNDING_SIZE, spawnCol } from "./constants.ts";

/** Rotate bounding-box cell coordinates one step clockwise. */
function rotateCW(cell: Cell, size: number): Cell {
  return { row: cell.col, col: size - 1 - cell.row };
}

/** Occupied cells of `kind` at `rotation`, in bounding-box coordinates. */
export function shapeCells(kind: PieceKind, rotation: RotationIndex): readonly Cell[] {
  const size = BOUNDING_SIZE[kind];
  let cells = BASE_CELLS[kind];
  const steps = rotation as number;
  for (let i = 0; i < steps; i++) {
    cells = cells.map((c) => rotateCW(c, size));
  }
  return cells;
}

/** Absolute board cells occupied by an active piece. */
export function absoluteCells(piece: ActivePiece): readonly Cell[] {
  const shape = shapeCells(piece.kind, piece.rotation);
  return shape.map((c) => ({ row: piece.row + c.row, col: piece.col + c.col }));
}

/** The bounding-box top-left origin for a fresh spawn of `kind`. */
export function spawnOrigin(kind: PieceKind): { readonly row: number; readonly col: number } {
  const base = BASE_CELLS[kind];
  const topRow = base.reduce((min, c) => Math.min(min, c.row), Number.POSITIVE_INFINITY);
  // `0 - topRow` avoids the `-0` that unary-minus of a zero top row produces.
  return { row: 0 - topRow, col: spawnCol(BOUNDING_SIZE[kind]) };
}

/** Construct a spawn piece of `kind` at the playfield top. */
export function spawnPiece(kind: PieceKind): ActivePiece {
  const origin = spawnOrigin(kind);
  return { kind, row: origin.row, col: origin.col, rotation: 0 };
}
