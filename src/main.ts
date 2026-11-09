// Composition root. The single browser entry point: it connects the imperative
// shell to the DOM and starts the loop. Nothing else reaches across the
// boundary; the game itself is created inside `createController`.

import { createController } from "./shell/controller.ts";

function boot(): void {
  const canvas = document.getElementById("board");
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error("missing #board canvas");
  }
  createController(canvas).start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
