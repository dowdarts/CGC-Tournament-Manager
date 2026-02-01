import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON ? './' : '/CGC-Tournament-Manager/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['brackets-viewer', 'brackets-manager', 'brackets-model']
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      include: [/brackets-viewer/, /brackets-manager/, /brackets-model/, /node_modules/]
    }
  }
})
