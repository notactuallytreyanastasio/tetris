import { test } from "node:test";
import assert from "node:assert/strict";

// End-to-end wiring smoke test. It boots the real browser entry point
// (`src/main.ts`) against a hand-stubbed DOM, then drives the animation loop
// and keyboard input. It proves the composition root links the imperative
// shell to the functional core and survives repeated play — without needing an
// actual browser. Presentation internals and game rules are covered elsewhere.

interface StubKeyboardEvent {
  readonly code: string;
  readonly preventDefault: () => void;
}

interface StubEnv {
  readonly fillText: string[];
  readonly listeners: Map<string, ((event: StubKeyboardEvent) => void)[]>;
  readonly readFrame: () => ((now: number) => void) | null;
}

function makeEnv(): StubEnv {
  const fillText: string[] = [];
  const listeners = new Map<string, ((event: StubKeyboardEvent) => void)[]>();
  const state = { frame: null as ((now: number) => void) | null };

  class Ctx {
    fillStyle = "";
    strokeStyle = "";
    lineWidth = 1;
    font = "";
    textAlign = "";
    fillRect(): void {}
    strokeRect(): void {}
    clearRect(): void {}
    beginPath(): void {}
    moveTo(): void {}
    lineTo(): void {}
    stroke(): void {}
    fillText(text: string): void {
      fillText.push(text);
    }
  }

  class HTMLCanvasElementStub {}

  class FakeCanvas extends HTMLCanvasElementStub {
    width = 0;
    height = 0;
    private readonly ctx = new Ctx();
    getContext(kind: string): Ctx {
      assert.equal(kind, "2d");
      return this.ctx;
    }
  }

  const canvas = new FakeCanvas();

  const doc = {
    readyState: "complete",
    getElementById(id: string): unknown {
      return id === "board" ? canvas : null;
    },
    addEventListener(): void {},
  };

  const win = {
    addEventListener(type: string, handler: (event: StubKeyboardEvent) => void): void {
      const list = listeners.get(type) ?? [];
      list.push(handler);
      listeners.set(type, list);
    },
    removeEventListener(type: string, handler: (event: StubKeyboardEvent) => void): void {
      const list = listeners.get(type) ?? [];
      const i = list.indexOf(handler);
      if (i !== -1) list.splice(i, 1);
    },
  };

  const raf = (cb: (now: number) => void): number => {
    state.frame = cb;
    return 1;
  };
  const caf = (_id: number): void => {};

  Object.assign(globalThis, {
    HTMLCanvasElement: HTMLCanvasElementStub,
    document: doc,
    window: win,
    requestAnimationFrame: raf,
    cancelAnimationFrame: caf,
  });

  return { fillText, listeners, readFrame: () => state.frame };
}

function press(env: StubEnv, code: string): void {
  const event: StubKeyboardEvent = { code, preventDefault(): void {} };
  for (const handler of env.listeners.get("keydown") ?? []) {
    handler(event);
  }
}

function lastScore(fillText: string[]): number {
  for (let i = fillText.length - 1; i >= 0; i--) {
    const match = /^SCORE\s+(\d+)$/.exec(fillText[i] ?? "");
    if (match !== null) return Number(match[1]);
  }
  return -1;
}

test("main.ts boots the shell against a stubbed DOM and survives play", async () => {
  const env = makeEnv();
  await import("../src/main.ts");

  // Boot renders the HUD once before scheduling the loop.
  assert.ok(
    env.fillText.some((t) => /^SCORE\s+\d+$/.test(t)),
    `expected a HUD score render, saw ${JSON.stringify(env.fillText.slice(0, 3))}`,
  );
  const frame = env.readFrame();
  assert.notEqual(frame, null, "requestAnimationFrame must schedule the loop");
  const step = frame as (now: number) => void;

  // Advance well past a gravity interval; the loop must not throw.
  step(0);
  step(100000);

  // Drop pieces without moving them: the stack builds and the pipeline holds.
  for (let i = 0; i < 30; i++) {
    press(env, "Space");
    step(100000 + i * 10);
  }

  // Hard drops award distance points, so the score must climb above zero.
  assert.ok(lastScore(env.fillText) > 0, `score stayed ${lastScore(env.fillText)}`);

  // The stack must reach a terminal/overlay state: either the pile tops out or
  // the pause overlay draws. Either way the shell renders it without crashing.
  press(env, "KeyP");
  step(200000);
  assert.ok(
    env.fillText.includes("PAUSED") || env.fillText.includes("GAME OVER"),
    `no overlay drawn after heavy play; tail=${JSON.stringify(env.fillText.slice(-4))}`,
  );
});
