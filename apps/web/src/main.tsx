import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'
import './styles/globals.css'
import App from './App.tsx'
import { initPerformanceMonitoring } from './utils/performance'
import { registerSW } from 'virtual:pwa-register'
import { ProfileThemeProvider } from './contexts/ProfileThemeContext'

// Initialize performance monitoring
initPerformanceMonitoring()

// Register service worker with auto-update
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    console.log('Service Worker registered:', swUrl)

    // Set up periodic sync for agent status updates
    if (registration && 'periodicSync' in registration) {
      const periodicSync = registration.periodicSync as { register: (tag: string, options?: { minInterval?: number }) => Promise<void> }
      periodicSync.register('agent-status-sync', {
        minInterval: 60 * 1000, // 1 minute
      }).catch((err: Error) => {
        console.log('Periodic sync registration failed:', err)
      })
    }
  },
  onOfflineReady() {
    console.log('App is ready for offline use')
  },
  onNeedRefresh() {
    // Auto-reload when new version is available
    if (confirm('New version available. Reload to update?')) {
      window.location.reload()
    }
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfileThemeProvider>
      <App />
    </ProfileThemeProvider>
  </StrictMode>,
)