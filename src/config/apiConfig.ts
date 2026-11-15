/**
 * Centralized API Configuration for Web + Compiled Android APK (Capacitor)
 *
 * Priority order:
 * 1. User-configured runtime API URL override in localStorage ('unicampus_custom_api_url')
 * 2. Build-time Vite environment variable (import.meta.env.VITE_API_URL)
 * 3. Default localhost backend when running on local dev browser, or Render HTTPS endpoint in APK
 */

const STORAGE_KEY_API_URL = 'unicampus_custom_api_url';
export const STORAGE_KEY_AUTH_TOKEN = 'unicampus_jwt_token_v1';
export const STORAGE_KEY_AUTH_USER = 'unicampus_auth_user_v1';

// 60-second timeout to gracefully handle Render Free Tier cold starts (spin-up delay)
export const RENDER_COLD_START_TIMEOUT_MS = 60000;
// Threshold (ms) after which we show a friendly "Waking up Render server..." banner
export const COLD_START_BANNER_DELAY_MS = 2200;

export function isNativeCapacitorApk(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
}

function ensureApiSuffix(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function getApiBaseUrl(): string {
  try {
    const customUrl = localStorage.getItem(STORAGE_KEY_API_URL);
    if (customUrl && customUrl.trim()) {
      return ensureApiSuffix(customUrl);
    }
  } catch {
    // ignore storage access errors
  }

  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl && envUrl.trim()) {
    return ensureApiSuffix(envUrl);
  }

  // If running inside Capacitor APK without a custom env var, default to configured cloud API URL
  if (isNativeCapacitorApk()) {
    return 'https://unicampus-api-ncw2.onrender.com/api';
  }

  // If running on localhost browser during development
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:5000/api';
  }

  // Same-origin /api on Vercel / web deployments
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/api`;
  }

  return '/api';
}

export function setCustomApiBaseUrl(url: string | null): void {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY_API_URL);
    } else {
      const normalized = url.trim().replace(/\/+$/, '');
      const withApi = normalized.endsWith('/api') ? normalized : `${normalized}/api`;
      localStorage.setItem(STORAGE_KEY_API_URL, withApi);
    }
  } catch {
    // ignore storage errors
  }
}
