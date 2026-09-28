import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // '' loads every variable in frontend/.env, not only VITE_*; BACKEND_URL stays out of the bundle.
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // Same origin as in production, where nginx forwards /api (docs/architecture/deployment.md).
      proxy: { '/api': env.BACKEND_URL || 'http://localhost:3000' },
    },
    test: {
      environment: 'jsdom',
      include: ['test/**/*.test.{ts,tsx}'],
    },
  };
});
