/**
 * PWARegistration — v0.49.0
 * 
 * Replaces ServiceWorkerKiller from v0.45.3. Now performs three jobs:
 * 
 * 1. VERSION CLEANUP — On version change, clears stale Zustand persist keys
 *    to prevent hydration mismatches. Same logic as the old ServiceWorkerKiller.
 * 
 * 2. PWA REGISTRATION — Registers the network-first service worker (/pwa-sw.js)
 *    for offline support and installability. Only in production.
 * 
 * 3. UPDATE DETECTION — Watches for new SW versions and shows a toast when
 *    an update is available, prompting the user to reload.
 */


import { useEffect, useState } from 'react';
import { APP_VERSION } from '@/config/version';

const LS_VERSION_KEY = 'ligature-app-version';
const LS_PWA_DISMISSED = 'ligature-pwa-install-dismissed';

// Known Zustand persist keys to clear on version change
const PERSIST_KEYS = [
  'ActivityStore', 'ligature-aggregate-reports', 'LigatureApp',
  'AuditStore', 'ligature-clinical-reg-bridge', 'CrossReferenceStore',
  'LigatureDemoAnalytics', 'LigatureDemo', 'DocumentViewerStore',
  'ligature-feature-flags', 'ligature-guided-scenarios',
  'NavigationStackStore', 'NotificationStore', 'ligature-product-context',
  'ligature-reg-intel', 'ligature-regintel-storage', 'LigatureSession', 'ligature-snapshots',
  'ThemeStore', 'LigatureUserRole', 'ligature-advanced-campaign',
  'persona-store',
];

export function PWARegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ========================================================================
    // 1. VERSION CLEANUP — clear stale persisted state on version change
    // ========================================================================
    try {
      const storedVersion = localStorage.getItem(LS_VERSION_KEY);
      if (storedVersion !== APP_VERSION) {
        console.log(`[PWA] Version changed ${storedVersion} → ${APP_VERSION}, clearing persisted state`);
        PERSIST_KEYS.forEach(key => localStorage.removeItem(key));
        localStorage.setItem(LS_VERSION_KEY, APP_VERSION);
        console.log(`[PWA] Cleared ${PERSIST_KEYS.length} store keys, stamped ${APP_VERSION}`);
      }
    } catch {
      // localStorage might be unavailable
    }

    // ========================================================================
    // 2. PWA REGISTRATION — register service worker in production only
    // ========================================================================
    if (!('serviceWorker' in navigator)) return;
    
    // Only register in production (Vercel) — skip in dev
    const isProduction = window.location.hostname !== 'localhost' 
      && !window.location.hostname.includes('127.0.0.1');
    
    if (!isProduction) {
      // In dev: still kill any leftover SWs
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      }).catch(() => {});
      return;
    }

    // Register the production service worker
    navigator.serviceWorker
      .register('/pwa-sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service worker registered:', registration.scope);

        // ====================================================================
        // 3. UPDATE DETECTION — watch for new versions
        // ====================================================================
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — show update prompt
              console.log('[PWA] New version available');
              setUpdateAvailable(true);
            }
          });
        });

        // Check for updates every 30 minutes
        setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);
      })
      .catch((error) => {
        console.warn('[PWA] Service worker registration failed:', error);
      });

    // Listen for controller change (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // The new SW has taken over — could reload, but let user decide
      console.log('[PWA] New service worker activated');
    });
  }, []);

  // Update notification toast
  if (!updateAvailable) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 z-[200] bg-surface-elevated border border-border rounded-xl shadow-2xl p-4 max-w-sm animate-in fade-in slide-in-from-bottom-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">Update available</p>
          <p className="text-xs text-text-muted mt-0.5">A new version of Ligature is ready.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => window.location.reload()}
          className="flex-1 px-3 py-1.5 bg-accent-blue text-white text-xs font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          Refresh now
        </button>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
