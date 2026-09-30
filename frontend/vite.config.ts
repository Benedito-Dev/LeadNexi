import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // xfwd: repassa o endereço da página (X-Forwarded-Host), como a Vercel faz. O backend
      // usa isso para montar o endereço de retorno do login do Instagram.
      '/api': { target: 'http://localhost:3000', changeOrigin: true, xfwd: true },
    },
  },
})
