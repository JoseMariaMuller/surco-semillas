import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // three.js ocupa ~700 KB sin comprimir y va en un chunk diferido (React.lazy),
    // así que el aviso por defecto de 500 KB no aporta. El total sigue < 450 KB gzip.
    chunkSizeWarningLimit: 1100,
  },
})
