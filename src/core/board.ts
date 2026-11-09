// Immutable board operations: construction, occupancy, locking a piece, and
// clearing full rows. Each mutation returns a fresh grid (copy-on-write).

import type { ActivePiece, Board, CellValue, PieceKind } from "./types.ts";
import { COLS, ROWS } from "./constants.ts";
import { absoluteCells } from "./pieces.ts";

/** A fresh, empty playfield. */
export function emptyBoard(): Board {
  const rows: CellValue[][] = [];
  for (let r = 0; r < ROWS; r++) {
    rows.push(new Array<CellValue>(COLS).fill(null));
  }
  return rows;
}

/** Read a cell in range; out-of-range access throws rather than returning
 * `undefined`, so callers must guard bounds explicitly. */
export function getCell(board: Board, row: number, col: number): CellValue {
  const r = board[row];
  if (r === undefined) {
    throw new RangeError(`row ${row} out of range`);
  }
  const v = r[col];
  if (v === undefined) {
    throw new RangeError(`col ${col} out of range`);
  }
  return v;
}

/** Whether a cell is within the playfield. */
export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < ROWS && col >= 0 && col < COLS;
}

/** Lock `piece` into `board`, writing its kind into each occupied in-range
 * cell. Cells above the field (row < 0) are ignored on write. */
export function lockPiece(board: Board, piece: ActivePiece): Board {
  const cells = absoluteCells(piece);
  const next: CellValue[][] = board.map((row) => row.slice());
  for (const cell of cells) {
    if (cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS) {
      const target = next[cell.row];
      if (target !== undefined) {
        target[cell.col] = piece.kind as PieceKind;
      }
    }
  }
  return next;
}

/** Drop every completely filled row and shift the stack down, returning the
 * new board and how many rows were removed. */
export function clearFullRows(board: Board): { readonly board: Board; readonly cleared: number } {
  const kept: ReadonlyArray<ReadonlyArray<CellValue>> = board.filter(
    (row) => !row.every((cell) => cell !== null),
  );
  const cleared = board.length - kept.length;
  if (cleared === 0) {
    return { board, cleared: 0 };
  }
  const empty: CellValue[][] = [];
  for (let r = 0; r < cleared; r++) {
    empty.push(new Array<CellValue>(COLS).fill(null));
  }
  const next: Board = [...empty, ...kept];
  return { board: next, cleared };
}
