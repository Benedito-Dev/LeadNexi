import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      // xfwd: repassa o endereço da página (X-Forwarded-Host), como a Vercel faz. O backend
      // usa isso para montar o endereço de retorno do login do Instagram.
      '/api': { target: 'http://localhost:3000', changeOrigin: true, xfwd: true },
    },
  },
})
