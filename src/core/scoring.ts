// Scoring and level progression. Pure functions of (lines, level).

import { LINE_SCORE, LINES_PER_LEVEL } from "./constants.ts";

/** Points earned for clearing `cleared` lines at `level`. */
export function scoreForClear(cleared: number, level: number): number {
  // A standard field can complete at most four rows at once; clamp any larger
  // count (only reachable from crafted states) onto the four-line value so the
  // reducer stays total instead of throwing on a degenerate clear.
  const clamped = Number.isFinite(cleared) ? Math.max(0, Math.floor(cleared)) : 0;
  const base = LINE_SCORE[Math.min(clamped, 4)] ?? 0;
  return base * level;
}

/** Level reached after `total` lines have been cleared; starts at 1. */
export function levelForLines(total: number): number {
  return Math.floor(total / LINES_PER_LEVEL) + 1;
}
