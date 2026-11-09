import { test } from "node:test";
import assert from "node:assert/strict";

import { initialState, transition } from "../src/core/index.ts";
import { emptyBoard, getCell } from "../src/core/board.ts";
import { COLS, ROWS } from "../src/core/constants.ts";
import { rngInit } from "../src/core/rng.ts";
import type { Action, ActivePiece, Board, CellValue, GameState } from "../src/core/types.ts";

function baseState(overrides: Partial<GameState>): GameState {
  const fresh = initialState(0);
  return { ...fresh, board: emptyBoard(), ...overrides };
}

function fillBottomRowExcept(board: Board, cols: readonly number[]): Board {
  const rows: CellValue[][] = board.map((row) => row.slice());
  const bottom = ROWS - 1;
  for (let c = 0; c < COLS; c++) {
    if (!cols.includes(c)) {
      rows[bottom]![c] = "J" as CellValue;
    }
  }
  return rows;
}

test("initial state is a running game with a piece and a preview queue", () => {
  const s = initialState(2024);
  assert.equal(s.status, "running");
  assert.notEqual(s.active, null);
  assert.ok(s.queue.length >= 5);
  assert.equal(s.score, 0);
  assert.equal(s.level, 1);
  assert.equal(s.board.length, ROWS);
});

test("same seed produces identical opening state", () => {
  const a = initialState(99);
  const b = initialState(99);
  assert.equal(a.active?.kind, b.active?.kind);
  assert.deepEqual(a.queue, b.queue);
  assert.equal(a.rng.seed, b.rng.seed);
});

test("replaying the same action sequence yields identical states", () => {
  const script: Action[] = [
    { kind: "move-left" },
    { kind: "rotate-cw" },
    { kind: "hard-drop" },
    { kind: "tick" },
    { kind: "tick" },
    { kind: "hard-drop" },
  ];
  const run = (seed: number): GameState => {
    let s = initialState(seed);
    for (const action of script) {
      s = transition(s, action).state;
    }
    return s;
  };
  assert.deepEqual(run(5), run(5));
});

test("hard drop locks the piece and spawns the next one", () => {
  const s = baseState({});
  const before = s.active as ActivePiece;
  const result = transition(s, { kind: "hard-drop" });
  assert.notEqual(result.state.active, null);
  // Some cell near the bottom must now be filled.
  assert.notEqual(getCell(result.state.board, ROWS - 1, 4), null);
  // The hard-drop score equals distance * 2.
  assert.ok(result.state.score >= 2, "hard drop awards distance points");
  assert.ok(before.kind.length > 0);
});

test("completing a bottom row clears it and scores a single", () => {
  const board = fillBottomRowExcept(emptyBoard(), [4, 5]);
  const active: ActivePiece = { kind: "O", row: 0, col: 4, rotation: 0 };
  const s = baseState({ board, active, queue: ["I", "S", "T", "Z", "L"], rng: rngInit(0) });
  const result = transition(s, { kind: "hard-drop" });
  assert.equal(result.linesCleared, 1);
  assert.equal(result.state.lines, 1);
  assert.equal(result.state.board.length, ROWS);
  // The completed bottom row is gone; the O's remaining row has fallen into it.
  assert.equal(getCell(result.state.board, ROWS - 1, 0), null);
  assert.equal(getCell(result.state.board, ROWS - 1, 4), "O");
  // 100 * level(1) for the single, plus hard-drop distance points.
  assert.ok(result.state.score >= 100, `score was ${result.state.score}`);
});

test("clearing the tenth line levels up", () => {
  const board = fillBottomRowExcept(emptyBoard(), [4, 5]);
  const active: ActivePiece = { kind: "O", row: 0, col: 4, rotation: 0 };
  const s = baseState({
    board,
    active,
    lines: 9,
    level: 1,
    queue: ["I", "S", "T", "Z", "L"],
    rng: rngInit(0),
  });
  const result = transition(s, { kind: "hard-drop" });
  assert.equal(result.state.lines, 10);
  assert.equal(result.state.level, 2);
});

test("tick advances gravity one row while airborne", () => {
  const s = baseState({});
  const result = transition(s, { kind: "tick" });
  const before = s.active as ActivePiece;
  const after = result.state.active as ActivePiece;
  assert.equal(after.row, before.row + 1);
});

test("pause ignores tick but resumes", () => {
  const paused = transition(baseState({}), { kind: "pause" }).state;
  assert.equal(paused.status, "paused");
  const frozen = transition(paused, { kind: "tick" });
  assert.equal(frozen.state, paused, "no gravity while paused");
  const resumed = transition(frozen.state, { kind: "pause" });
  assert.equal(resumed.state.status, "running");
});

test("game-over state is absorbing for every action", () => {
  const dead = baseState({ status: "game-over", active: null });
  const actions: Action[] = [
    { kind: "tick" },
    { kind: "hard-drop" },
    { kind: "move-left" },
    { kind: "pause" },
  ];
  for (const action of actions) {
    assert.equal(transition(dead, action).state, dead);
  }
});

test("top-out ends the game", () => {
  // A tall stack with a one-wide shaft down column 9 and a few locked cells in
  // row 0. The active vertical-I drops into the shaft without ever completing
  // a row, and the next spawn collides head-on with the locked row-0 cells.
  const rows: CellValue[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: CellValue[] = new Array<CellValue>(COLS).fill(null);
    if (r >= 1) {
      for (let c = 1; c <= 8; c++) row[c] = "S" as CellValue;
    }
    rows.push(row);
  }
  for (let c = 3; c <= 6; c++) rows[0]![c] = "S" as CellValue;

  const active: ActivePiece = { kind: "I", row: 0, col: 7, rotation: 1 };
  const s = baseState({ board: rows, active, queue: ["I", "S", "T", "Z", "L"], rng: rngInit(0) });
  const result = transition(s, { kind: "hard-drop" });
  assert.equal(result.state.status, "game-over");
  assert.equal(result.state.active, null);
});
