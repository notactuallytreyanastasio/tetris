// SRS rotation with wall kicks. Given a board and a piece, attempt to rotate
// one step in a direction, trying each kick offset in order; return the first
// legal placement, or null when every offset is blocked. Pure.

import type { ActivePiece, Board, RotationIndex } from "./types.ts";
import { collides } from "./collision.ts";
import { KICKS } from "./constants.ts";

/** Offset table for a kind and rotation transition. O has no kicks. */
function kickOffsets(kind: ActivePiece["kind"], from: RotationIndex, to: RotationIndex): readonly (readonly [number, number])[] {
  if (kind === "O") {
    return [[0, 0]];
  }
  const prefix = kind === "I" ? "I:" : "";
  const key = `${prefix}${from}>${to}`;
  const offsets = KICKS[key];
  if (offsets === undefined) {
    throw new Error(`missing kick table for ${key}`);
  }
  return offsets;
}

/** Rotate `piece` clockwise or counter-clockwise on `board`, applying wall
 * kicks. Returns the resulting piece, or null if the rotation is blocked. */
export function rotate(
  board: Board,
  piece: ActivePiece,
  direction: "cw" | "ccw",
): ActivePiece | null {
  const from = piece.rotation;
  const to: RotationIndex = direction === "cw"
    ? ((from + 1) % 4) as RotationIndex
    : ((from + 3) % 4) as RotationIndex;

  for (const [dx, dyUp] of kickOffsets(piece.kind, from, to)) {
    const candidate: ActivePiece = {
      ...piece,
      rotation: to,
      col: piece.col + dx,
      // SRS y grows upward; board row grows downward, so negate.
      row: piece.row - dyUp,
    };
    if (!collides(board, candidate)) {
      return candidate;
    }
  }
  return null;
}
