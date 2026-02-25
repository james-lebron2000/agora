import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
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
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Optimize manual chunks with better splitting
        manualChunks(id) {
          // React ecosystem
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          // Web3 / Wallet libraries
          if (
            id.includes('node_modules/viem') ||
            id.includes('node_modules/wagmi') ||
            id.includes('node_modules/@reown') ||
            id.includes('node_modules/@walletconnect') ||
            id.includes('node_modules/@coinbase')
          ) {
            return 'web3-vendor'
          }
          // UI libraries
          if (
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/@tailwindcss')
          ) {
            return 'ui-vendor'
          }
          // Utility libraries
          if (
            id.includes('node_modules/zod') ||
            id.includes('node_modules/axios') ||
            id.includes('node_modules/lodash')
          ) {
            return 'utils-vendor'
          }
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1] || ''
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]'
          }
          if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Enable source maps for production debugging
    sourcemap: mode === 'development',
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
      },
    },
  },
  // Preload configuration
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'viem',
      'wagmi',
      '@reown/appkit',
      '@reown/appkit-adapter-wagmi',
    ],
    exclude: [],
  },
}))