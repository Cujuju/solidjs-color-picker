/**
 * Vite library build for @cujuju/solidjs-color-picker.
 *
 * Why Vite + vite-plugin-solid, and NOT tsup/esbuild:
 *   Solid needs its OWN JSX transform (babel-preset-solid → `template()` +
 *   `createComponent`) to produce reactive components. esbuild's JSX loader
 *   emits `React.createElement`, which in a package with no React dependency
 *   is an undefined global at runtime AND has zero reactivity. Verified
 *   empirically 2026-07-29 — a tsup build of this exact source emitted
 *   `React.createElement("div", { ref: swatchEl, ... })` for ColorSwatch.
 *   vite-plugin-solid runs the same transform as the consuming app's dev
 *   pipeline, so the published artifact matches what is tested locally.
 *
 * This config is deliberately SELF-CONTAINED. The sibling `solidjs-toolkit`
 * monorepo shares one `packages/_shared/vite.lib.config.ts` across its
 * packages; this repo is standalone, so importing that path would couple the
 * build to a directory outside the repo. (A `../_shared/vite.lib.config`
 * import was carried in here by a copy from that monorepo and resolved to
 * nothing — the build could not run at all.)
 *
 * Output:
 *   dist/index.js     — ESM bundle, JSX transformed by vite-plugin-solid
 *   dist/utils.js     — the pure colour-string helpers, as their OWN entry
 *   dist/index.d.ts   — declarations (vite-plugin-dts); this is what a
 *                       `link:`-ing consumer TYPE-checks against, even when
 *                       the `solid` export condition makes it RUN from src.
 *   dist/index.js.map — source map
 *
 * Why `utils` is a SECOND entry and not just a named re-export from index:
 * `src/utils.ts` is pure string/number arithmetic with no Solid import, and
 * callers exist that want exactly that (colour maths in a prefs or surface
 * module) without dragging the picker's components into their module graph.
 * A single entry would force those callers through `index.ts`, which imports
 * every component — recoverable by tree-shaking in a production bundle, but
 * not in dev, and not at all for a consumer that reads the graph rather than
 * bundles it. Two entries make the separation a contract instead of an
 * optimisation.
 *
 * ESM only: every consumer of a Solid component library is a bundler, and
 * `exports` here has never advertised a `require` condition.
 */

import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    solid(),
    // Declarations as separate files mirroring src/ (tsc's own default).
    // Rolling them into one file adds build complexity with no benefit at
    // this size. Tests are excluded so they stay out of the published types.
    dts({
      rollupTypes: false,
      include: ['src/**/*'],
      exclude: ['src/__tests__/**', 'src/**/*.test.ts'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        utils: resolve(__dirname, 'src/utils.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // solid-js and its sub-modules stay external: it is a peer dep, and a
      // second bundled copy would create a second reactive graph, so a
      // context created by one instance is invisible to the other.
      external: ['solid-js', 'solid-js/web', 'solid-js/store'],
    },
    emptyOutDir: true,
    sourcemap: true,
    // Consumers' bundlers minify the final app. Leaving library output
    // unminified keeps stack traces readable and makes dist/ diffable
    // across versions.
    minify: false,
  },
});
