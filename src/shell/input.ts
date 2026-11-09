// Imperative shell: keyboard input mapping. Translates browser key events
// into core `Action` values and forwards them to a dispatch callback. No core
// logic here; only the event -> intent mapping.

import type { Action } from "../core/index.ts";

export type Dispatch = (action: Action) => void;

/** Map a KeyboardEvent to a game action, or null if the key is not bound. */
const KEY_MAP: Readonly<Record<string, Action>> = {
  ArrowLeft: { kind: "move-left" },
  ArrowRight: { kind: "move-right" },
  ArrowDown: { kind: "soft-drop" },
  ArrowUp: { kind: "rotate-cw" },
  KeyZ: { kind: "rotate-ccw" },
  KeyX: { kind: "rotate-cw" },
  Space: { kind: "hard-drop" },
  KeyP: { kind: "pause" },
};

/** Attach keyboard handling to `target` (usually window). Returns a detach
 * function so the shell owns subscription lifecycle. */
export function attachInput(target: Window, dispatch: Dispatch): () => void {
  const handler = (event: KeyboardEvent): void => {
    const action = KEY_MAP[event.code];
    if (action === undefined) {
      return;
    }
    event.preventDefault();
    dispatch(action);
  };
  target.addEventListener("keydown", handler);
  return () => target.removeEventListener("keydown", handler);
}
