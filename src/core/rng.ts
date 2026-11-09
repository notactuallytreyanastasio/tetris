// Seeded, data-driven pseudo-random generator (mulberry32). Carries its state
// as a number so every draw is a pure function that returns the next state
// alongside its value. No ambient randomness is read anywhere in the core.

import type { Bag, Drawn, PieceKind, RngState } from "./types.ts";
import { KINDS } from "./constants.ts";

/** Initial RNG state from a seed. */
export function rngInit(seed: number): RngState {
  return { seed: seed >>> 0 };
}

/** Draw one float in [0, 1) and the state to draw again. */
export function rngNext(state: RngState): DrawnFloat {
  let s = (state.seed + 0x6d2b79f5) | 0;
  const seed = s >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, rng: { seed } };
}

/** A single float draw paired with the state to continue from. */
interface DrawnFloat {
  readonly value: number;
  readonly rng: RngState;
}

/** Fisher-Yates shuffle over the seven kinds, returning the shuffled bag and
 * the advanced RNG state. */
function shuffleBag(state: RngState): Bag {
  const kinds: PieceKind[] = KINDS.slice();
  let rng = state;
  for (let i = kinds.length - 1; i > 0; i--) {
    const draw = rngNext(rng);
    rng = draw.rng;
    const j = Math.floor(draw.value * (i + 1));
    const swap = kinds[i] as PieceKind;
    kinds[i] = kinds[j] as PieceKind;
    kinds[j] = swap;
  }
  return { kinds, rng };
}

/** Draw the next kind, replenishing a fresh 7-bag when the current one is
 * exhausted. Returns the kind, the remaining queue, and the new RNG state. */
export function drawFromBag(
  queue: readonly PieceKind[],
  state: RngState,
): { readonly kind: PieceKind; readonly queue: readonly PieceKind[]; readonly rng: RngState } {
  if (queue.length > 0) {
    const kind = queue[0] as PieceKind;
    return { kind, queue: queue.slice(1), rng: state };
  }
  const bag = shuffleBag(state);
  const kind = bag.kinds[0] as PieceKind;
  return { kind, queue: bag.kinds.slice(1), rng: bag.rng };
}

/** Produce a fresh bag of seven kinds (used by tests and previewing). */
export function newBag(state: RngState): Bag {
  return shuffleBag(state);
}
