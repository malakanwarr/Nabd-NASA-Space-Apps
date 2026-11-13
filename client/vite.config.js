// Vite config (Malak only): React, dev proxy to the server, and the PWA (installable app) setup.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NABD',
        short_name: 'NABD',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0B1230',
        background_color: '#0B1230',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,json,wasm,task}'],
        // The face model is bigger than the default 2 MB limit.
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': 'http://localhost:5050' },
  },
});
