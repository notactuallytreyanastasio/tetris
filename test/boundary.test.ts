import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// These tests enforce the architectural boundary itself: they scan source text
// rather than running the game. They fail the build if the functional core
// ever reaches for ambient state, or if the shell bypasses the core boundary.

const CORE_DIR = new URL("../src/core", import.meta.url).pathname;
const SHELL_DIR = new URL("../src/shell", import.meta.url).pathname;
const SRC_DIR = new URL("../src", import.meta.url).pathname;

function tsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

function read(dir: string): { name: string; text: string; code: string }[] {
  return tsFiles(dir).map((name) => {
    const text = readFileSync(name, "utf8");
    return { name, text, code: stripComments(text) };
  });
}

// Ambient effects forbidden inside the pure core.
const FORBIDDEN_IN_CORE: ReadonlyArray<readonly [string, RegExp]> = [
  ["Math.random", /\bMath\.random\b/],
  ["Date.now", /\bDate\.now\b/],
  ["performance", /\bperformance\b/],
  ["document", /\bdocument\b/],
  ["window", /\bwindow\b/],
  ["localStorage", /\blocalStorage\b/],
  ["setTimeout", /\bsetTimeout\b/],
  ["setInterval", /\bsetInterval\b/],
  ["requestAnimationFrame", /\brequestAnimationFrame\b/],
  ["globalThis", /\bglobalThis\b/],
  ["as any", /\bas any\b/],
  [": any", /:\s*any\b/],
  ["any[]", /\bany\s*\[\]/],
  ["<any>", /<\s*any\s*[>,]/],
];

test("the core contains no ambient side-effecting identifiers", () => {
  for (const { name, code } of read(CORE_DIR)) {
    for (const [label, pattern] of FORBIDDEN_IN_CORE) {
      assert.equal(
        pattern.test(code),
        false,
        `core file ${name} must not contain ${label}`,
      );
    }
  }
});

test("the core imports nothing outside the core", () => {
  for (const { name, code } of read(CORE_DIR)) {
    // Every core-to-core import is a sibling "./x.ts"; a "../" would leave it.
    assert.equal(
      /from\s+["']\.\.\//.test(code),
      false,
      `core file ${name} must not import outside the core`,
    );
  }
});

test("the shell and entry point import the core only through index.ts", () => {
  const shellFiles = [...read(SHELL_DIR), join(SRC_DIR, "main.ts")];
  for (const file of shellFiles) {
    const name = typeof file === "string" ? file : file.name;
    const text = typeof file === "string" ? readFileSync(name, "utf8") : file.text;
    const matches = [...text.matchAll(/from\s+["'](\.\.\/core\/[^"']+)["']/g)];
    for (const match of matches) {
      const spec = match[1];
      assert.equal(
        spec,
        "../core/index.ts",
        `shell file ${name} must import the core boundary, got ${spec}`,
      );
    }
  }
});

test("the core boundary is the sole export surface the shell relies on", () => {
  const text = readFileSync(join(CORE_DIR, "index.ts"), "utf8");
  // The boundary re-exports the reducer and the initial-state constructor.
  assert.match(text, /export\s+\{\s*initialState,\s*transition\s*\}/);
});
