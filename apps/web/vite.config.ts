import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/relay': {
        target: 'http://45.32.219.241:8789',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/relay/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 分离大型第三方库
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react'],
          'web3-vendor': ['viem', 'wagmi', '@reown/appkit'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
