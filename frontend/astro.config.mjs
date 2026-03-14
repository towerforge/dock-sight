import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        '/sysinfo': 'http://localhost:8080',
        '/docker-service': 'http://localhost:8080',
        '/openapi.json': 'http://localhost:8080',
      },
    },
  },
});