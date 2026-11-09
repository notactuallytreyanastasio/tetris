// The reducer: a total, pure `transition(state, action)` that is the single
// entry point across the boundary. Time and randomness arrive only as data;
// nothing ambient (clock, random, DOM) is consulted.

import type { Action, ActivePiece, Board, GameState, PieceKind, StepResult } from "./types.ts";
import { clearFullRows, emptyBoard, lockPiece } from "./board.ts";
import { collides, isGrounded, tryShift } from "./collision.ts";
import { spawnPiece } from "./pieces.ts";
import { rotate } from "./rotation.ts";
import { drawFromBag, newBag, rngInit } from "./rng.ts";
import { levelForLines, scoreForClear } from "./scoring.ts";
import { HARD_DROP_POINTS, SOFT_DROP_POINTS } from "./constants.ts";

/** Number of pending kinds always kept in the preview queue. */
const QUEUE_FLOOR = 5;

/** Top up the preview queue to `min` kinds, drawing bags as needed. */
function refillQueue(
  queue: readonly PieceKind[],
  rng: GameState["rng"],
  min: number,
): { readonly queue: readonly PieceKind[]; readonly rng: GameState["rng"] } {
  let result = queue;
  let state = rng;
  while (result.length < min) {
    const bag = newBag(state);
    result = result.concat(bag.kinds);
    state = bag.rng;
  }
  return { queue: result, rng: state };
}

/** Pop the next kind, replenishing bags so the queue never empties. */
function pullKind(state: GameState): { readonly kind: PieceKind; readonly queue: readonly PieceKind[]; readonly rng: GameState["rng"] } {
  const drawn = drawFromBag(state.queue, state.rng);
  const topped = refillQueue(drawn.queue, drawn.rng, QUEUE_FLOOR);
  return { kind: drawn.kind, queue: topped.queue, rng: topped.rng };
}

/** Lock the active piece, clear lines, score, level up, spawn the next piece,
 * and detect top-out. Returns the resulting state and lines cleared. */
function lockAndSpawn(state: GameState, piece: ActivePiece): StepResult {
  const lockedBoard = lockPiece(state.board, piece);
  const { board, cleared } = clearFullRows(lockedBoard);

  const nextLines = state.lines + cleared;
  const nextLevel = levelForLines(nextLines);
  const nextScore = state.score + scoreForClear(cleared, state.level);

  const after = pullKind(state);
  const candidate = spawnPiece(after.kind);

  if (collides(board, candidate)) {
    return {
      state: {
        ...state,
        board,
        active: null,
        queue: after.queue,
        rng: after.rng,
        score: nextScore,
        lines: nextLines,
        level: nextLevel,
        status: "game-over",
      },
      linesCleared: cleared,
    };
  }

  return {
    state: {
      ...state,
      board,
      active: candidate,
      queue: after.queue,
      rng: after.rng,
      score: nextScore,
      lines: nextLines,
      level: nextLevel,
    },
    linesCleared: cleared,
  };
}

/** Build a fresh running game from a seed. */
export function initialState(seed: number): GameState {
  const bag = newBag(rngInit(seed));
  const kind = bag.kinds[0] as PieceKind;
  const topped = refillQueue(bag.kinds.slice(1), bag.rng, QUEUE_FLOOR);
  return {
    board: emptyBoard(),
    active: spawnPiece(kind),
    queue: topped.queue,
    rng: topped.rng,
    score: 0,
    lines: 0,
    level: 1,
    status: "running",
  };
}

/** Softly move down one row, awarding points; locks when already grounded. */
function softDrop(state: GameState): StepResult {
  const piece = state.active;
  if (piece === null) {
    return { state, linesCleared: 0 };
  }
  if (isGrounded(state.board, piece)) {
    return lockAndSpawn(state, piece);
  }
  const moved = tryShift(state.board, piece, 1, 0);
  if (moved === null) {
    return lockAndSpawn(state, piece);
  }
  return {
    state: { ...state, active: moved, score: state.score + SOFT_DROP_POINTS },
    linesCleared: 0,
  };
}

/** Drop straight to the lowest free row, awarding points, then lock. */
function hardDrop(state: GameState): StepResult {
  const piece = state.active;
  if (piece === null) {
    return { state, linesCleared: 0 };
  }
  let resting = piece;
  let distance = 0;
  for (;;) {
    const next = tryShift(state.board, resting, 1, 0);
    if (next === null) {
      break;
    }
    resting = next;
    distance += 1;
  }
  const scored: GameState = {
    ...state,
    score: state.score + distance * HARD_DROP_POINTS,
  };
  return lockAndSpawn(scored, resting);
}

/** Advance one gravity row; locks when grounded. */
function gravity(state: GameState): StepResult {
  const piece = state.active;
  if (piece === null) {
    return { state, linesCleared: 0 };
  }
  if (isGrounded(state.board, piece)) {
    return lockAndSpawn(state, piece);
  }
  const moved = tryShift(state.board, piece, 1, 0);
  if (moved === null) {
    return lockAndSpawn(state, piece);
  }
  return { state: { ...state, active: moved }, linesCleared: 0 };
}

/** Toggle pause, ignoring a dead game. */
function togglePause(state: GameState): GameState {
  if (state.status === "game-over") {
    return state;
  }
  return { ...state, status: state.status === "paused" ? "running" : "paused" };
}

/** Apply horizontal movement, ignoring a dead or paused game. */
function horizontal(state: GameState, dCol: number): GameState {
  const piece = state.active;
  if (piece === null) {
    return state;
  }
  const moved = tryShift(state.board, piece, 0, dCol);
  return moved === null ? state : { ...state, active: moved };
}

/** Apply rotation, ignoring a dead or paused game. */
function turn(state: GameState, direction: "cw" | "ccw"): GameState {
  const piece = state.active;
  if (piece === null) {
    return state;
  }
  const turned = rotate(state.board, piece, direction);
  return turned === null ? state : { ...state, active: turned };
}

/**
 * The boundary function. Total: every action yields a state, and a game-over
 * state is absorbing except for restart (performed by constructing a fresh
 * `initialState`). The shell dispatches exactly one `tick` per gravity row;
 * it decides how often, using `gravityDelayMs(level)`.
 */
export function transition(state: GameState, action: Action): StepResult {
  if (state.status === "game-over") {
    return { state, linesCleared: 0 };
  }
  if (state.status === "paused") {
    return { state: action.kind === "pause" ? togglePause(state) : state, linesCleared: 0 };
  }

  switch (action.kind) {
    case "move-left":
      return { state: horizontal(state, -1), linesCleared: 0 };
    case "move-right":
      return { state: horizontal(state, 1), linesCleared: 0 };
    case "rotate-cw":
      return { state: turn(state, "cw"), linesCleared: 0 };
    case "rotate-ccw":
      return { state: turn(state, "ccw"), linesCleared: 0 };
    case "soft-drop":
      return softDrop(state);
    case "hard-drop":
      return hardDrop(state);
    case "tick":
      return gravity(state);
    case "pause":
      return { state: togglePause(state), linesCleared: 0 };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
