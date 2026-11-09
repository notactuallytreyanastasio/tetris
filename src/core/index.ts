// The core's public boundary. The imperative shell imports ONLY from here.
// Everything the shell needs to render and drive the game is a pure function
// or immutable value; nothing here reads the clock, the DOM, or Math.random.

export type {
  Action,
  ActivePiece,
  Board,
  Cell,
  CellValue,
  GameStatus,
  GameState,
  PieceKind,
  RotationIndex,
  StepResult,
} from "./types.ts";

export { COLS, ROWS, BASE_CELLS, BOUNDING_SIZE, gravityDelayMs } from "./constants.ts";
export { initialState, transition } from "./reducer.ts";
export { absoluteCells, shapeCells, spawnPiece } from "./pieces.ts";
export { emptyBoard, getCell, inBounds } from "./board.ts";
export { collides, isGrounded, projectToGround } from "./collision.ts";
