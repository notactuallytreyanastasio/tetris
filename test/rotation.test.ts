import { test } from "node:test";
import assert from "node:assert/strict";

import { rotate } from "../src/core/rotation.ts";
import { absoluteCells, spawnPiece } from "../src/core/pieces.ts";
import { emptyBoard } from "../src/core/board.ts";
import { collides } from "../src/core/collision.ts";
import { COLS, ROWS } from "../src/core/constants.ts";
import type { ActivePiece, Board, CellValue, RotationIndex } from "../src/core/types.ts";

function cellKey(piece: ActivePiece): string {
  return absoluteCells(piece)
    .map((c) => `${c.row}:${c.col}`)
    .sort()
    .join(",");
}

test("four clockwise rotations return a piece to its original footprint", () => {
  const board = emptyBoard();
  const piece = spawnPiece("T");
  const start = piece;
  const startKey = cellKey(start);
  let current = start;
  for (let i = 0; i < 4; i++) {
    const turned = rotate(board, current, "cw");
    assert.notEqual(turned, null);
    current = turned as ActivePiece;
    assert.equal(current.rotation, (((start.rotation + i + 1) % 4) as RotationIndex));
  }
  assert.equal(cellKey(current), startKey);
});

test("cw then ccw restores orientation", () => {
  const board = emptyBoard();
  const piece = spawnPiece("J");
  const cw = rotate(board, piece, "cw");
  assert.notEqual(cw, null);
  const back = rotate(board, cw as ActivePiece, "ccw");
  assert.notEqual(back, null);
  assert.deepEqual(back, piece);
});

test("a fully surrounded piece cannot rotate (all kicks blocked)", () => {
  // Fill the whole field except the exact cells an O occupies; then a T whose
  // kick offsets are all filled returns null.
  const rows: CellValue[][] = [];
  for (let r = 0; r < ROWS; r++) {
    rows.push(new Array<CellValue>(COLS).fill("Z"));
  }
  const board: Board = rows;

  // Carve a cavity exactly matching a T at row 8, col 3 (rotation 0) so the
  // piece is valid but has no free neighbour in any kick position.
  const piece: ActivePiece = { kind: "T", row: 8, col: 3, rotation: 0 };
  for (const cell of absoluteCells(piece)) {
    const target = rows[cell.row];
    if (target !== undefined) target[cell.col] = null;
  }
  assert.equal(collides(board, piece), false, "carved piece sits free");

  const turned = rotate(board, piece, "cw");
  assert.equal(turned, null, "every kick collides");
});

test("rotate never leaves the piece in a colliding state", () => {
  const board = emptyBoard();
  let piece = spawnPiece("S");
  for (let i = 0; i < 8; i++) {
    const turned = rotate(board, piece, i % 2 === 0 ? "cw" : "ccw");
    if (turned !== null) {
      assert.equal(collides(board, turned), false);
      piece = turned;
    }
  }
});
