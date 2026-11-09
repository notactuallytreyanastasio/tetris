// Collision detection against walls, floor and locked cells. The top row is a
// solid wall: a piece may never occupy row < 0. Pure.

import type { ActivePiece, Board } from "./types.ts";
import { absoluteCells } from "./pieces.ts";
import { getCell, inBounds } from "./board.ts";
import { COLS, ROWS } from "./constants.ts";

/** True when the piece overlaps a wall, the floor, or a locked cell. */
export function collides(board: Board, piece: ActivePiece): boolean {
  for (const cell of absoluteCells(piece)) {
    if (!inBounds(cell.row, cell.col)) {
      // Wall (col) or top/bottom out-of-range => solid.
      return true;
    }
    if (getCell(board, cell.row, cell.col) !== null) {
      return true;
    }
  }
  return false;
}

/** True when the piece has nothing directly beneath it (resting on stack or
 * floor). */
export function isGrounded(board: Board, piece: ActivePiece): boolean {
  const moved: ActivePiece = { ...piece, row: piece.row + 1 };
  return collides(board, moved);
}

/** Shift a piece by (dRow, dCol) if the result is free; otherwise return the
 * piece unchanged. */
export function tryShift(
  board: Board,
  piece: ActivePiece,
  dRow: number,
  dCol: number,
): ActivePiece | null {
  const moved: ActivePiece = {
    ...piece,
    row: piece.row + dRow,
    col: piece.col + dCol,
  };
  return collides(board, moved) ? null : moved;
}

/** Column count, re-exported so collision consumers do not import constants
 * directly. Keeps the collision module self-contained. */
export const WIDTH = COLS;
export const HEIGHT = ROWS;

/** Project a piece straight down to its lowest legal row (the hard-drop /
 * "ghost" resting position). Returns the resting piece. Pure. */
export function projectToGround(board: Board, piece: ActivePiece): ActivePiece {
  let resting = piece;
  for (;;) {
    const next = tryShift(board, resting, 1, 0);
    if (next === null) {
      return resting;
    }
    resting = next;
  }
}
