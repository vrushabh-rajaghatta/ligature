/**
 * ServiceWorkerKiller — v0.45.3
 * 
 * Nuclear option: unregisters ALL service workers, deletes ALL caches,
 * and clears stale localStorage on version mismatch.
 * 
 * The inline <script> in layout.tsx handles the SW kill before React loads.
 * This component is a belt-and-suspenders backup that also handles
 * version-aware localStorage cleanup.
 */


import { useEffect } from 'react';
import { APP_VERSION } from '@/config/version';

const LS_VERSION_KEY = 'ligature-app-version';

export function ServiceWorkerKiller() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Kill ALL service workers (backup for the inline script)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => {
          console.log('[SWKiller] Unregistering SW:', reg.scope);
          reg.unregister();
        });
      }).catch(() => {});
    }

    // 2. Delete ALL caches (not just version-matched ones)
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log('[SWKiller] Deleting cache:', name);
          caches.delete(name);
        });
      }).catch(() => {});
    }

    // 3. Version-aware localStorage cleanup
    try {
      const storedVersion = localStorage.getItem(LS_VERSION_KEY);
      if (storedVersion !== APP_VERSION) {
        console.log(`[SWKiller] Version changed ${storedVersion} → ${APP_VERSION}, clearing ALL persisted state`);
        // Known Zustand persist keys
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
        PERSIST_KEYS.forEach(key => localStorage.removeItem(key));
        // Stamp the new version
        localStorage.setItem(LS_VERSION_KEY, APP_VERSION);
        console.log(`[SWKiller] Cleared ${PERSIST_KEYS.length} store keys, stamped ${APP_VERSION}`);
      }
    } catch {
      // localStorage might be unavailable
    }
  }, []);

  return null;
}
