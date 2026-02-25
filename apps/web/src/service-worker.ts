/// <reference lib="WebWorker" />

import type { PrecacheEntry } from 'workbox-precaching'

// Extend ServiceWorkerGlobalScope to include __WB_MANIFEST
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: (string | PrecacheEntry)[]
  }
}

declare const self: ServiceWorkerGlobalScope

import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

// Enable immediate claim of clients
self.skipWaiting()
clientsClaim()

// Clean up outdated caches
cleanupOutdatedCaches()

// Precache all assets built by Vite
precacheAndRoute(self.__WB_MANIFEST)

// Fallback to index.html for navigation routes (SPA support)
const handler = createHandlerBoundToURL('/index.html')
const navigationRoute = new NavigationRoute(handler)
registerRoute(navigationRoute)

// API calls - Network First with background sync
registerRoute(
  ({ url }) => url.pathname.startsWith('/relay/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
      new BackgroundSyncPlugin('bridge-transactions-queue', {
        maxRetentionTime: 24 * 60, // 24 hours in minutes
      }),
    ],
  })
)

// Google Fonts - Cache First
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
)

// Google Fonts Static - Cache First
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
)

// Static JS/CSS - Cache First
registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Images - Cache First
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Web3/Wallet Provider Requests - Stale While Revalidate
registerRoute(
  ({ url }) =>
    url.hostname.includes('rpc') ||
    url.hostname.includes('infura') ||
    url.hostname.includes('alchemy') ||
    url.hostname.includes('quicknode'),
  new StaleWhileRevalidate({
    cacheName: 'rpc-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60, // 1 minute - RPC data gets stale quickly
      }),
    ],
  })
)

// Background Sync Event Handler
self.addEventListener('sync', (event) => {
  const syncEvent = event as Event & { tag: string; waitUntil(promise: Promise<void>): void }
  if (syncEvent.tag === 'bridge-transactions-queue') {
    syncEvent.waitUntil(syncBridgeTransactions())
  }
  if (syncEvent.tag === 'agent-status-sync') {
    syncEvent.waitUntil(syncAgentStatus())
  }
})

// Periodic Sync Event Handler
self.addEventListener('periodicsync', (event) => {
  const periodicEvent = event as Event & { tag: string; waitUntil(promise: Promise<void>): void }
  if (periodicEvent.tag === 'agent-status-sync') {
    periodicEvent.waitUntil(syncAgentStatus())
  }
})

// Push Notification Handler (for future use)
self.addEventListener('push', (event: PushEvent) => {
  if (event.data) {
    const data = event.data.json() as {
      title: string
      body: string
      tag?: string
      url?: string
    }
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: data.tag || 'default',
        data: data.url || '/',
      })
    )
  }
})

// Notification Click Handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow((event.notification.data as string) || '/')
  )
})

// Message Handler for communication with main thread
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  // Handle custom sync requests
  if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncAgentStatus())
  }
})

// Helper function to sync bridge transactions
async function syncBridgeTransactions(): Promise<void> {
  const queue = await getQueue('bridge-transactions-queue')

  for (const request of queue) {
    try {
      const response = await fetch(request)
      if (response.ok) {
        await removeFromQueue('bridge-transactions-queue', request)
        console.log('[SW] Bridge transaction synced successfully')
      }
    } catch (error) {
      console.error('[SW] Failed to sync bridge transaction:', error)
    }
  }
}

// Helper function to sync agent status
async function syncAgentStatus(): Promise<void> {
  try {
    const response = await fetch('/relay/agent/status')
    if (response.ok) {
      const data = await response.json()
      // Store last sync time
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.postMessage({
          type: 'AGENT_STATUS_UPDATE',
          payload: data,
          timestamp: Date.now(),
        })
      }
      console.log('[SW] Agent status synced successfully')
    }
  } catch (error) {
    console.error('[SW] Failed to sync agent status:', error)
  }
}

// IndexedDB helper for queue management
async function getQueue(_queueName: string): Promise<Request[]> {
  return new Promise((resolve) => {
    const request = indexedDB.open('workbox-background-sync', 1)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['requests'], 'readonly')
      const store = transaction.objectStore('requests')
      const getAll = store.getAll()
      getAll.onsuccess = () => {
        const allRequests = getAll.result.filter((item: { queueName: string }) => item.queueName === _queueName)
        resolve(allRequests.map((item: { requestData: Request }) => item.requestData))
      }
      getAll.onerror = () => resolve([])
    }
    request.onerror = () => resolve([])
  })
}

async function removeFromQueue(_queueName: string, request: Request): Promise<void> {
  return new Promise((resolve) => {
    const dbRequest = indexedDB.open('workbox-background-sync', 1)
    dbRequest.onsuccess = () => {
      const db = dbRequest.result
      const transaction = db.transaction(['requests'], 'readwrite')
      const store = transaction.objectStore('requests')
      // Use request URL as key (simplified)
      store.delete(request.url)
      resolve()
    }
    dbRequest.onerror = () => resolve()
  })
}

console.log('[SW] Agora Service Worker initialized')
