// Build script: bundles the browser entry (imperative shell -> core boundary)
// into a single classic script. Run with `npm run build` (Node 24+ runs this
// .ts directly).

import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  outfile: "dist/bundle.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  minify: true,
  logLevel: "info",
});
