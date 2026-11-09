import { test } from "node:test";
import assert from "node:assert/strict";

import { clearFullRows, emptyBoard, getCell, inBounds, lockPiece } from "../src/core/board.ts";
import { COLS, ROWS } from "../src/core/constants.ts";
import type { ActivePiece, Board, CellValue, PieceKind } from "../src/core/types.ts";
import { spawnPiece } from "../src/core/pieces.ts";

function filledRow(fill: boolean): CellValue[] {
  return new Array<CellValue>(COLS).fill(fill ? "T" : null);
}

function boardOf(rows: readonly CellValue[][]): Board {
  return rows;
}

test("clearFullRows removes a complete bottom row and shifts the stack", () => {
  const rows: CellValue[][] = [];
  for (let r = 0; r < ROWS; r++) {
    rows.push(filledRow(false));
  }
  // Make the last two rows full, leave one gap in the row above them.
  for (let c = 0; c < COLS; c++) {
    rows[ROWS - 1]![c] = "S";
    rows[ROWS - 2]![c] = "Z";
  }
  rows[ROWS - 3]![0] = "O"; // partial row stays

  const { board, cleared } = clearFullRows(boardOf(rows));
  assert.equal(cleared, 2);
  // Clearing the two full rows shifts the stack down two: the partial row
  // (a single O) lands at the very bottom, above it two fresh empty rows.
  assert.equal(getCell(board, ROWS - 1, 0), "O");
  assert.equal(getCell(board, ROWS - 2, 0), null);
  assert.equal(getCell(board, ROWS - 3, 0), null);
});

test("clearFullRows keeps a board unchanged when no row is complete", () => {
  const board = emptyBoard();
  const result = clearFullRows(board);
  assert.equal(result.cleared, 0);
  assert.equal(result.board, board);
});

test("inBounds rejects the wall above the field and out-of-range columns", () => {
  assert.equal(inBounds(0, 0), true);
  assert.equal(inBounds(-1, 0), false);
  assert.equal(inBounds(0, -1), false);
  assert.equal(inBounds(0, COLS), false);
});

test("lockPiece writes the piece kind into occupied cells only", () => {
  const board = emptyBoard();
  const piece: ActivePiece = { ...spawnPiece("O"), row: 5, col: 4, rotation: 0 };
  const locked = lockPiece(board, piece);
  assert.equal(getCell(locked, 5, 4), "O");
  assert.equal(getCell(locked, 5, 5), "O");
  assert.equal(getCell(locked, 6, 4), "O");
  assert.equal(getCell(locked, 4, 4), null);
});

test("lockPiece ignores cells above the playfield", () => {
  const board = emptyBoard();
  const piece: ActivePiece = { kind: "I" as PieceKind, row: -1, col: 3, rotation: 0 };
  const locked = lockPiece(board, piece);
  // I at rotation 0 with bbox row -1 lands its cells at row 0.
  assert.equal(getCell(locked, 0, 3), "I");
});
