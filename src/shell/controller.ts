// Imperative shell: the game loop and mutable state holder. This is the only
// place that mutates a game state (reassigning the variable); every mutation
// is produced by the pure core `transition`. The loop decides *when* to tick,
// using the core's pure `gravityDelayMs`, but the core decides *what* a tick
// does. Time enters here, never inside the core.

import {
  gravityDelayMs,
  initialState,
  transition,
  type Action,
  type GameState,
} from "../core/index.ts";
import { createRenderer } from "./render.ts";
import { attachInput } from "./input.ts";

export interface Controller {
  readonly start: () => void;
  readonly stop: () => void;
  readonly restart: () => void;
}

/** Seed chosen at the shell edge, where ambient randomness is permitted. */
function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x1000000)) >>> 0;
}

/** Wire the core to the canvas and keyboard. Returns controls for the loop. */
export function createController(canvas: HTMLCanvasElement): Controller {
  const renderer = createRenderer(canvas);

  let state: GameState = initialState(newSeed());
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let accumulator = 0;

  function render(): void {
    renderer.render(state);
  }

  function apply(action: Action): void {
    const result = transition(state, action);
    state = result.state;
  }

  function dispatch(action: Action): void {
    apply(action);
    render();
  }

  function frame(now: number): void {
    if (lastTime !== null) {
      const dt = now - lastTime;
      accumulator += dt;
      const delay = gravityDelayMs(state.level);
      // Bounded catch-up so a backgrounded tab does not lock up or skip.
      let budget = 8;
      while (accumulator >= delay && budget > 0 && state.status === "running") {
        accumulator -= delay;
        apply({ kind: "tick" });
        budget -= 1;
      }
      if (budget === 0) {
        accumulator = 0;
      }
    }
    lastTime = now;
    render();
    rafId = requestAnimationFrame(frame);
  }

  function restart(): void {
    state = initialState(newSeed());
    accumulator = 0;
    lastTime = null;
    render();
  }

  function start(): void {
    attachInput(window, dispatch);
    window.addEventListener("keydown", (event: KeyboardEvent) => {
      if (event.code === "KeyR") {
        event.preventDefault();
        restart();
      }
    });
    render();
    rafId = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  return { start, stop, restart };
}
