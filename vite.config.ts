import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode offline` builds a single self-contained HTML file that works from file://
// (no CDN, no server, no separate asset requests). See PRODUCT_SPEC.md §54 / §77.9.
export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  return {
    base: './',
    plugins: [preact(), ...(offline ? [viteSingleFile()] : [])],
    build: {
      outDir: offline ? 'dist-offline' : 'dist',
      target: 'es2022',
      assetsInlineLimit: offline ? 100_000_000 : 4096,
      cssCodeSplit: !offline,
    },
    worker: { format: 'es' },
  };
});
