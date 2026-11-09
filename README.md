# Tetris

A browser Tetris written in TypeScript with **zero `any`**, a **functional core**
and an **imperative shell**. The engine is a pure, total, deterministic function
of its arguments; everything that touches the clock, the DOM, or the network
lives behind a single boundary and is verified by tests.

This is not just the game — it's the *decision graph* of how it got built. The
whole design history is recorded in [`deciduous`](https://github.com/deciduous)
and committed in [`.deciduous/graph.json`](.deciduous/graph.json). Read the
story below, or `deciduous serve` to walk the graph yourself.

## Play it

```bash
npm install
npm run build     # esbuild bundle -> dist/bundle.js (~8.7kb)
npm start         # static server at http://localhost:8000/
```

| Key | Action |
|---|---|
| ← / → | Move |
| ↑ / X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| ↓ | Soft drop |
| Space | Hard drop |
| P | Pause |
| R | Restart |

## Verify it

```bash
npm run typecheck   # tsc --noEmit, strict, no implicit any
npm test            # node --test, 28 tests, no test framework
```

`npm test` runs six files against the pure core and the shell:

- **determinism** — replaying the same action sequence yields identical states.
- **board** — row clearing, cell access, bounds.
- **rotation** — SRS wall kicks; four CW rotations return the original footprint;
  a surrounded piece cannot rotate; rotation never lands in a colliding cell.
- **reducer** — hard-drop lock + spawn, single/double/… scoring, level-up,
  gravity tick, pause is a no-op then resumes, top-out ends the game, the
  game-over state is *absorbing* for every action.
- **boundary** — the core imports nothing outside `src/core`; the shell reaches
  the core *only* through `src/core/index.ts`.
- **integration** — boots the real browser entry against a stubbed DOM and drops
  thirty pieces into a top-out plus a pause.

## The architecture, and why it looks this way

```
goal ──> options ──> decisions ──> actions ──> outcome ──> lessons
```

### The goal

> *"start a git repo, track things in deciduous, and using no any() types and
> strong boundaries and explicit contracts, built tetris in Typescript and
> package it up for play. Make it a functional core and an imperative shell. Be
> considerate when designing your boundaries. make sure you can verify things
> really work."*

The constraint that drove everything else: **the core had to be a pure function
of its arguments** — deterministic, replayable, testable with fake inputs. Two
things normally make a game impure: randomness and the clock. Those became the
first fork in the graph.

### Decision 1 — where does randomness live?

| Option | Verdict |
|---|---|
| **RNG inside `GameState` (seeded, data-driven)** | ✅ Chosen — `transition(state, action)` stays total; the whole game is a deterministic function of `(seed, actions)`. |
| RNG callback injected by the shell | ❌ Rejected — injecting `Math.random` breaks totality; ambient randomness leaks into the core, and you can't replay or test it. |

The core carries a seeded RNG and a 7-bag as immutable data inside the state.

### Decision 2 — who owns the clock?

| Option | Verdict |
|---|---|
| **Shell drives time via `dt` passed into tick** | ✅ Chosen — the core never calls `Date.now`/`performance`; gravity is a pure function of accumulated ticks, so tests run on fake time. |
| Core owns the clock | ❌ Rejected — the core would read ambient time, breaking determinism. |

The shell measures elapsed time and feeds `tick`/`dt` across the boundary.

### The two halves

- **`src/core/`** — the pure engine. Seeded RNG, 7-bag, board ops, SRS rotation
  with wall-kick tables, collision, scoring, gravity, and a **total** `transition`
  reducer. It imports nothing outside `src/core/` and never reads the clock, the
  DOM, or `Math.random`. Strict `tsconfig` (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitAny`) keeps `any` out.
- **`src/shell/`** — canvas renderer (ghost piece, next preview, HUD), keyboard
  input mapping, and a `requestAnimationFrame` loop that dispatches one tick per
  gravity row. It holds *all* mutable subscriptions and imports the core **only**
  through `src/core/index.ts` — the single boundary.

The boundary isn't a convention, it's a *test*. The boundary scan fails if the
core reaches outward or the shell bypasses `index.ts`.

### The outcome

> **Tetris packaged and verified playable.** `tsc --noEmit` clean; 28 `node:test`
> tests green; esbuild bundle 8.7kb; the static server returns 200 for
> `index.html` and `dist/bundle.js` with correct content types and refuses path
> traversal; `main.ts` boots the shell against a stubbed DOM and survives thirty
> hard drops plus a pause.

### Lessons the graph kept

- **The boundary scan must read code, not comments.** It first tripped on
  `Math.random` inside a doc comment. A purity rule has to inspect code, so the
  scanner strips comments before matching forbidden ambient identifiers.
- **Totality survived a crafted near-full board.** A test that filled the field
  forced 20 cleared lines at once, which made the old `scoreForClear` *throw*. A
  total reducer can't throw, so it now clamps the count to the four-line value.
- **`assert.deepStrictEqual` treats `+0` and `-0` as unequal.** A unary minus on
  a zero spawn row produced `-0` and broke identity assertions; geometry now
  normalizes `-0` and `spawnOrigin` uses `0 - topRow`.
- **The browser entry is e2e-testable headlessly** by stubbing
  `HTMLCanvasElement`/`document`/`window`/`rAF`, then dynamic-importing `main.ts`
  (which boots synchronously once `document.readyState` is complete).

## The decision graph

The design decisions above are nodes and edges, not prose:

```bash
deciduous nodes        # list nodes on this branch
deciduous graph        # export the graph as JSON
deciduous serve        # web viewer with auto-refresh
```

`.deciduous/graph.json` is committed and carries a git merge driver so the graph
survives a multi-user pull; the local SQLite database stays private (see
`.gitignore`).

## Layout

```
src/core/   pure engine (no clock, no DOM, no Math.random)
src/shell/  renderer + input + rAF loop; imports core via index.ts only
src/main.ts browser composition root
public/     the single HTML entry
test/       28 tests: determinism, board, rotation, reducer, boundary, integration
build.ts    esbuild -> dist/bundle.js
serve.ts    dependency-free static server
```

Node ≥ 24, `type: module`, no runtime dependencies.
