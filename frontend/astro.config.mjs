import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKEND = `http://localhost:${process.env.BACKEND_PORT ?? 8080}`;

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': `${__dirname}/src`,
      },
    },
    server: {
      proxy: {
        '/sysinfo': BACKEND,
        '/docker-service': BACKEND,
        '/openapi.json': BACKEND,
        '/api': BACKEND,
      },
    },
  },
});