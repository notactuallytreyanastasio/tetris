// Pure domain vocabulary for the Tetris core.
// This module has no runtime behaviour and imports nothing browser- or
// node-specific. It is the explicit contract the shell is allowed to speak.

/** The seven tetrominoes. Doubles as the colour key for locked cells. */
export type PieceKind = "I" | "J" | "L" | "O" | "S" | "T" | "Z";

/**
 * Rotation index in the SRS sense: 0 = spawn, 1 = CW (R), 2 = 180 (2),
 * 3 = CCW (L). Arithmetic is modular over 0..3.
 */
export type RotationIndex = 0 | 1 | 2 | 3;

/** A single occupied cell of the board or of a piece, in board coordinates.
 * `row` grows downward (0 = top), `col` grows rightward (0 = left). */
export interface Cell {
  readonly row: number;
  readonly col: number;
}

/** A board cell: empty, or a locked tetromino identified by its kind. */
export type CellValue = PieceKind | null;

/** Immutable grid of locked cells, row-major, rows top-to-bottom. */
export type Board = ReadonlyArray<ReadonlyArray<CellValue>>;

/** The falling piece: its kind, the board coordinate of its bounding-box
 * top-left corner, and its current rotation index. */
export interface ActivePiece {
  readonly kind: PieceKind;
  readonly row: number;
  readonly col: number;
  readonly rotation: RotationIndex;
}

/** Opaque seeded-RNG state carried as data so the core stays a pure
 * function of its arguments (see the `Keep randomness pure` decision). */
export interface RngState {
  readonly seed: number;
}

/** A drawn tetromino together with the RNG state that produced it. */
export interface Drawn {
  readonly kind: PieceKind;
  readonly rng: RngState;
}

/** A bag-based shuffle result: the next seven kinds and the new RNG state. */
export interface Bag {
  readonly kinds: readonly PieceKind[];
  readonly rng: RngState;
}

/** Why the game is not running, if it is not. */
export type GameStatus = "running" | "paused" | "game-over";

/** The complete, serialisable game state. Everything needed to render or to
 * resume is here; nothing outside here is consulted by `transition`. */
export interface GameState {
  readonly board: Board;
  readonly active: ActivePiece | null;
  /** Pending kinds, front is next; replenished from the bag. */
  readonly queue: readonly PieceKind[];
  readonly rng: RngState;
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  readonly status: GameStatus;
}

/** Input intents crossing the boundary from the shell into the core. All
 * time and randomness arrive as arguments; nothing ambient is read. */
export type Action =
  | { readonly kind: "move-left" }
  | { readonly kind: "move-right" }
  | { readonly kind: "rotate-cw" }
  | { readonly kind: "rotate-ccw" }
  | { readonly kind: "soft-drop" }
  | { readonly kind: "hard-drop" }
  | { readonly kind: "pause" }
  | { readonly kind: "tick" };

/** Result of applying an action: the next state plus a count of lines cleared
 * during that step (0 unless a lock happened), so the shell can animate. */
export interface StepResult {
  readonly state: GameState;
  readonly linesCleared: number;
}
