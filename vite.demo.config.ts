import { defineConfig } from 'vite';

// Demo dev-server config: `npm run dev` -> serves demo/index.html against src/*.ts directly
export default defineConfig({
  root: 'demo',
  server: {
    open: true,
  },
  build: {
    outDir: '../dist-demo',
  },
});
