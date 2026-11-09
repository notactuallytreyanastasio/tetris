import { test } from "node:test";
import assert from "node:assert/strict";

import { newBag, drawFromBag, rngInit } from "../src/core/rng.ts";
import { KINDS } from "../src/core/constants.ts";

test("same seed yields the same bag sequence", () => {
  const seed = rngInit(42);
  const first = newBag(seed);
  const second = newBag(rngInit(42));
  assert.deepEqual(first.kinds, second.kinds);
  assert.equal(first.rng.seed, second.rng.seed);
});

test("different seeds diverge", () => {
  const a = newBag(rngInit(1)).kinds.join("");
  const b = newBag(rngInit(2)).kinds.join("");
  // Not a guaranteed inequality, but with a 7-permutation space over
  // different seeds this collision is astronomically unlikely for fixed seeds.
  assert.notEqual(a, b);
});

test("each 7-bag contains all seven kinds exactly once", () => {
  let rng = rngInit(1);
  for (let bagIndex = 0; bagIndex < 40; bagIndex++) {
    const bag = newBag(rng);
    assert.equal(bag.kinds.length, 7);
    const counts = new Map<string, number>();
    for (const kind of bag.kinds) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    for (const kind of KINDS) {
      assert.equal(counts.get(kind), 1, `kind ${kind} appears once per bag`);
    }
    rng = bag.rng;
  }
});

test("drawFromBag never empties without replenishing", () => {
  const first = drawFromBag([], rngInit(7));
  assert.ok(KINDS.includes(first.kind));
  let queue = first.queue;
  let rng = first.rng;
  assert.equal(queue.length, 6);
  for (let i = 0; i < 100; i++) {
    const drawn = drawFromBag(queue, rng);
    assert.ok(KINDS.includes(drawn.kind));
    queue = drawn.queue;
    rng = drawn.rng;
  }
});
