import { defineConfig } from 'vite';

/**
 * Builds the level tools (tools/levels.ts) into a single Node script, so they
 * run with plain `node` and need no extra TypeScript runner dependency.
 * Never part of the game bundle.
 */
export default defineConfig({
  logLevel: 'warn',
  build: {
    ssr: 'tools/levels.ts',
    outDir: '.tools',
    emptyOutDir: true,
    target: 'node18',
    minify: false,
    rollupOptions: {
      output: { entryFileNames: 'levels.mjs', format: 'esm' },
    },
  },
});
