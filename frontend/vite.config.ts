import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
        secure: false,
      },
      /** Google Input Tools — English → Urdu phonetic */
      '/inputtools': {
        target: 'https://inputtools.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/inputtools/, ''),
      },
    },
  },
})
