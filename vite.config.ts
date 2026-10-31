import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Relative asset paths so the built bundle also works when loaded from a
  // file-based WebView (Capacitor) later on.
  base: './',
  // Shown on the Settings screen.
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: {
    host: true, // expose on the LAN so a real phone can open the dev server
  },
  build: {
    // Phaser alone is ~1.2 MB minified; keep it in its own chunk and silence
    // the default 500 kB warning, which is expected for a game bundle.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
});
