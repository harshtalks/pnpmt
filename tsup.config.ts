import { defineConfig } from 'tsup';

export default defineConfig({
  entryPoints: ['./index.ts'],
  clean: true,
  publicDir: true,
});
