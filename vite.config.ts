import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * A production-ads build (`--mode production-ads`, VITE_AD_MODE=production)
 * needs real AdMob IDs in src/ads/adIds.json: fail the build instead of
 * shipping a game that can't start its ads. Every other build uses test ads.
 */
function checkAdMode(mode: string): void {
  if (loadEnv(mode, process.cwd(), 'VITE_').VITE_AD_MODE !== 'production') return;
  const ids = JSON.parse(readFileSync(new URL('./src/ads/adIds.json', import.meta.url), 'utf8')) as { production: unknown };
  if (!ids.production) throw new Error('VITE_AD_MODE=production, but src/ads/adIds.json has no "production" IDs. See GOOGLE_PLAY_RELEASE.md.');
}

export default defineConfig(({ mode }) => (checkAdMode(mode), {
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
}));
