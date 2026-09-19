import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Library build config: `npm run build` -> dist/exsurge.{mjs,cjs,iife.js} + dist/exsurge.d.ts
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'exsurge',
      formats: ['es', 'cjs', 'iife'],
      fileName: (format) => ({
        es: 'exsurge.mjs',
        cjs: 'exsurge.cjs',
        iife: 'exsurge.iife.js',
      }[format]),
    },
    sourcemap: true,
    // zero runtime dependencies -> nothing needs to be marked external
    rollupOptions: {},
  },
  // rollupTypes is left off: with it, vite-plugin-dts delegates to
  // @microsoft/api-extractor to bundle all .d.ts into one file, which hits an
  // internal crash analyzing the QuickSvg object-literal export. Emitting
  // per-module .d.ts files (still re-exported from dist/index.d.ts) avoids
  // that tool entirely and works identically for consumers.
  plugins: [dts({ tsconfigPath: './tsconfig.json' })],
});
