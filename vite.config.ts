import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      // Push通知の受信処理 (public/push-sw.js) を Service Worker に取り込む
      workbox: {
        importScripts: ['push-sw.js']
      },
      manifest: {
        name: '声かけナイト',
        short_name: '声かけナイト',
        description: 'あなたを迷子から守る、心強い同行者',
        theme_color: '#4F46E5',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
