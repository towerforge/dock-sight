import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/sysinfo/, /^\/docker-service/, /^\/docker-network/, /^\/docker-volumes/, /^\/registries/],
      },
      manifest: {
        name: 'Dock Sight',
        short_name: 'Dock Sight',
        description: 'Dock Sight',
        theme_color: '#AF52DE',
        background_color: '#0f0f0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    proxy: {
      '/sysinfo':        `http://localhost:${process.env.BACKEND_PORT ?? 8080}`,
      '/docker-service': `http://localhost:${process.env.BACKEND_PORT ?? 8080}`,
      '/docker-network': `http://localhost:${process.env.BACKEND_PORT ?? 8080}`,
      '/docker-volumes': `http://localhost:${process.env.BACKEND_PORT ?? 8080}`,
      '/registries':     `http://localhost:${process.env.BACKEND_PORT ?? 8080}`,
      '/api':            `http://localhost:${process.env.BACKEND_PORT ?? 8080}`,
    },
  },
})
