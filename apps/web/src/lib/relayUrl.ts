export function resolveRelayUrl(): string {
  const env = (import.meta as any).env;
  const candidate = (env?.VITE_RELAY_URL as string | undefined) || '';
  if (candidate.trim()) return candidate.replace(/\/$/, '');

  // In production (Vercel), the app is served over HTTPS. Browsers will block
  // mixed-content fetches to a plain HTTP relay, so default to same-origin proxy.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '/relay';
  }

  return 'http://45.32.219.241:8789';
}

