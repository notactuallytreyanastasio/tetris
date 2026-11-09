// Imperative shell: canvas rendering. Owns all presentation (colours, layout)
// that the core deliberately does not know. Imports ONLY the core boundary.

import {
  COLS,
  ROWS,
  absoluteCells,
  getCell,
  projectToGround,
  shapeCells,
  type GameState,
  type PieceKind,
} from "../core/index.ts";

/** Presentation-only colour map. The core models a cell by kind, never by
 * colour, so this table lives entirely in the shell. */
const COLORS: Readonly<Record<PieceKind, string>> = {
  I: "#38bdf8",
  J: "#2563eb",
  L: "#f97316",
  O: "#facc15",
  S: "#22c55e",
  T: "#a855f7",
  Z: "#ef4444",
};

const CELL = 24;
const PAD = 10;
const PANEL = 150;

export interface Renderer {
  readonly render: (state: GameState) => void;
}

/** Build a renderer bound to a canvas context sized to the playfield + HUD. */
export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("canvas 2d context unavailable");
  }

  const width = PAD + COLS * CELL + PANEL;
  const height = PAD + ROWS * CELL;
  canvas.width = width;
  canvas.height = height;

  const panelX = PAD + COLS * CELL + 24;

  function drawCell(px: number, py: number, color: string, ghost: boolean): void {
    ctx!.fillStyle = color;
    if (ghost) {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 2;
      ctx!.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4);
      return;
    }
    ctx!.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    ctx!.strokeStyle = "rgba(0,0,0,0.35)";
    ctx!.lineWidth = 1;
    ctx!.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
  }

  function render(state: GameState): void {
    ctx!.clearRect(0, 0, width, height);
    ctx!.fillStyle = "#0b1120";
    ctx!.fillRect(0, 0, width, height);

    // Playfield background grid.
    ctx!.strokeStyle = "rgba(148,163,184,0.12)";
    ctx!.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      const x = PAD + c * CELL + 0.5;
      ctx!.beginPath();
      ctx!.moveTo(x, PAD);
      ctx!.lineTo(x, PAD + ROWS * CELL);
      ctx!.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      const y = PAD + r * CELL + 0.5;
      ctx!.beginPath();
      ctx!.moveTo(PAD, y);
      ctx!.lineTo(PAD + COLS * CELL, y);
      ctx!.stroke();
    }

    // Locked cells.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const value = getCell(state.board, r, c);
        if (value !== null) {
          drawCell(PAD + c * CELL, PAD + r * CELL, COLORS[value], false);
        }
      }
    }

    const active = state.active;
    if (active !== null) {
      // Ghost projection.
      const ghost = projectToGround(state.board, active);
      for (const cell of absoluteCells(ghost)) {
        if (cell.row >= 0) {
          drawCell(PAD + cell.col * CELL, PAD + cell.row * CELL, "#64748b", true);
        }
      }
      // Active piece.
      const color = COLORS[active.kind];
      for (const cell of absoluteCells(active)) {
        if (cell.row >= 0) {
          drawCell(PAD + cell.col * CELL, PAD + cell.row * CELL, color, false);
        }
      }
    }

    // HUD.
    ctx!.fillStyle = "#e2e8f0";
    ctx!.font = "bold 20px 'Courier New', monospace";
    ctx!.textAlign = "left";
    const lines = [
      `SCORE  ${state.score}`,
      `LINES  ${state.lines}`,
      `LEVEL  ${state.level}`,
    ];
    lines.forEach((text, i) => ctx!.fillText(text, panelX, PAD + 20 + i * 26));

    ctx!.fillText("NEXT", panelX, PAD + 110);
    for (let i = 0; i < Math.min(4, state.queue.length); i++) {
      const kind = state.queue[i] as PieceKind;
      const originY = PAD + 120 + i * 60;
      for (const cell of shapeCells(kind, 0)) {
        const px = panelX + cell.col * 16;
        const py = originY + cell.row * 16;
        ctx!.fillStyle = COLORS[kind];
        ctx!.fillRect(px, py, 14, 14);
      }
    }

    if (state.status !== "running") {
      const message = state.status === "paused" ? "PAUSED" : "GAME OVER";
      ctx!.fillStyle = "rgba(2,6,23,0.75)";
      ctx!.fillRect(PAD, PAD, COLS * CELL, ROWS * CELL);
      ctx!.fillStyle = "#f8fafc";
      ctx!.font = "bold 34px 'Courier New', monospace";
      ctx!.textAlign = "center";
      ctx!.fillText(message, PAD + (COLS * CELL) / 2, PAD + (ROWS * CELL) / 2);
    }
  }

  return { render };
}
