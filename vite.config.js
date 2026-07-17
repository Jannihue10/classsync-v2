import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-16.png', 'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
      workbox: {
        // Der Service-Worker darf die serverlosen /api-Routen NICHT als SPA-Navigation abfangen.
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'ClassSync',
        short_name: 'ClassSync',
        description: 'Alles für deine Klasse. An einem Ort.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#111111',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
