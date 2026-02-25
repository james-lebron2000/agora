import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectManifest: {
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
      manifest: {
        name: 'Agora Web',
        short_name: 'Agora',
        description: 'Agora - Web3 Agent Platform',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Bridge',
            short_name: 'Bridge',
            description: 'Access bridge feature',
            url: '/bridge',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Echo',
            short_name: 'Echo',
            description: 'Access Echo chat',
            url: '/echo',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
          },
        ],
        categories: ['finance', 'productivity'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@agora/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
    },
  },
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
    // Optimize chunk size (increased limit for web3 libraries)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimize manual chunks with better splitting strategy
        manualChunks(id) {
          // React ecosystem - core framework
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'react-core'
          }
          // React Query - data fetching
          if (id.includes('node_modules/@tanstack/react-query') || id.includes('node_modules/@tanstack/query-core')) {
            return 'query-vendor'
          }
          // Web3 / Wallet libraries - all in one chunk to avoid circular dependencies
          if (
            id.includes('node_modules/viem') ||
            id.includes('node_modules/wagmi') ||
            id.includes('node_modules/@reown') ||
            id.includes('node_modules/@walletconnect') ||
            id.includes('node_modules/@coinbase') ||
            id.includes('node_modules/@rainbow-me') ||
            id.includes('node_modules/@metamask') ||
            id.includes('node_modules/metamask')
          ) {
            return 'web3-vendor'
          }
          // UI libraries
          if (
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/@tailwindcss') ||
            id.includes('node_modules/recharts')
          ) {
            return 'ui-vendor'
          }
          // Utility libraries
          if (
            id.includes('node_modules/zod') ||
            id.includes('node_modules/axios') ||
            id.includes('node_modules/lodash') ||
            id.includes('node_modules/date-fns')
          ) {
            return 'utils-vendor'
          }
          // Charts and data visualization
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'charts-vendor'
          }
          // App components - split by feature
          if (id.includes('/src/components/')) {
            // Split large components into their own chunks
            if (id.includes('AgentProfile') || id.includes('BridgeCard') || id.includes('BridgeStatus')) {
              return 'feature-bridge'
            }
            if (id.includes('Echo') || id.includes('Chat')) {
              return 'feature-echo'
            }
            if (id.includes('Analytics') || id.includes('Stats')) {
              return 'feature-analytics'
            }
            return 'app-components'
          }
          // App pages - code split by route
          if (id.includes('/src/pages/')) {
            return 'app-pages'
          }
          // Hooks - can be shared
          if (id.includes('/src/hooks/')) {
            return 'app-hooks'
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
  // CSS configuration
  css: {
    // Enable CSS modules
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    // Enable dev sourcemaps
    devSourcemap: mode === 'development',
  },
}))
