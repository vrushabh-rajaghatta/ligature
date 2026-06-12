
/**
 * PWA Service
 * Service worker registration and management for offline support
 * 
 * v0.42.0 - Service Worker Caching
 */

// =============================================================================
// TYPES
// =============================================================================

export type ServiceWorkerStatus = 
  | 'unsupported'
  | 'unregistered'
  | 'installing'
  | 'installed'
  | 'activating'
  | 'activated'
  | 'updating'
  | 'error';

export interface PWAConfig {
  serviceWorkerPath: string;
  scope: string;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export interface CacheStats {
  [cacheName: string]: {
    count: number;
    urls: string[];
  };
}

export interface PWAState {
  status: ServiceWorkerStatus;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: PWAConfig = {
  serviceWorkerPath: '/service-worker.js',
  scope: '/',
};

// =============================================================================
// PWA SERVICE
// =============================================================================

export class PWAService {
  private config: PWAConfig;
  private state: PWAState = {
    status: 'unregistered',
    isOnline: true,
    isUpdateAvailable: false,
    registration: null,
  };
  private listeners: Set<(state: PWAState) => void> = new Set();
  private messageListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config: Partial<PWAConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined') {
      this.state.isOnline = navigator.onLine;
      
      if (!('serviceWorker' in navigator)) {
        this.state.status = 'unsupported';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Service workers not supported');
      return null;
    }

    try {
      this.updateState({ status: 'installing' });

      const registration = await navigator.serviceWorker.register(
        this.config.serviceWorkerPath,
        { scope: this.config.scope }
      );

      this.state.registration = registration;

      // Handle different states
      if (registration.installing) {
        this.trackInstalling(registration.installing);
      } else if (registration.waiting) {
        this.updateState({ status: 'installed', isUpdateAvailable: true });
      } else if (registration.active) {
        this.updateState({ status: 'activated' });
        this.config.onSuccess?.(registration);
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          this.trackInstalling(newWorker);
        }
      });

      // Setup event listeners
      this.setupNetworkListeners();
      this.setupMessageListener();

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      this.updateState({ status: 'error' });
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      const success = await this.state.registration.unregister();
      if (success) {
        this.updateState({ status: 'unregistered', registration: null });
      }
      return success;
    } catch (error) {
      console.error('Service worker unregistration failed:', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Update Management
  // ---------------------------------------------------------------------------

  /**
   * Check for service worker updates
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.state.registration) {
      return false;
    }

    try {
      await this.state.registration.update();
      return this.state.isUpdateAvailable;
    } catch (error) {
      console.error('Update check failed:', error);
      return false;
    }
  }

  /**
   * Apply pending update
   */
  async applyUpdate(): Promise<void> {
    const waiting = this.state.registration?.waiting;
    if (!waiting) {
      return;
    }

    // Tell waiting service worker to skip waiting
    waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for activation
    return new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.updateState({ isUpdateAvailable: false, status: 'activated' });
        resolve();
        // Optionally reload the page
        // window.location.reload();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats | null> {
    return new Promise((resolve) => {
      if (!this.state.registration?.active) {
        resolve(null);
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'CACHE_STATS') {
          navigator.serviceWorker.removeEventListener('message', handleMessage);
          resolve(event.data.payload);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      this.state.registration.active.postMessage({ type: 'GET_CACHE_STATS' });

      // Timeout
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(cacheName?: string): Promise<void> {
    if (this.state.registration?.active) {
      this.state.registration.active.postMessage({
        type: 'CLEAR_CACHE',
        payload: { cacheName },
      });
    }
  }

  /**
   * Cache a document
   */
  async cacheDocument(url: string, content: string): Promise<void> {
    if (this.state.registration?.active) {
      this.state.registration.active.postMessage({
        type: 'CACHE_DOCUMENT',
        payload: { url, content },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  private trackInstalling(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      switch (worker.state) {
        case 'installing':
          this.updateState({ status: 'installing' });
          break;
        case 'installed':
          if (navigator.serviceWorker.controller) {
            // Update available
            this.updateState({ status: 'installed', isUpdateAvailable: true });
            this.config.onUpdate?.(this.state.registration!);
          } else {
            // First install
            this.updateState({ status: 'installed' });
          }
          break;
        case 'activating':
          this.updateState({ status: 'activating' });
          break;
        case 'activated':
          this.updateState({ status: 'activated' });
          this.config.onSuccess?.(this.state.registration!);
          break;
        case 'redundant':
          this.updateState({ status: 'error' });
          break;
      }
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.updateState({ isOnline: true });
      this.config.onOnline?.();
    });

    window.addEventListener('offline', () => {
      this.updateState({ isOnline: false });
      this.config.onOffline?.();
    });
  }

  private setupMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data || {};
      
      const listeners = this.messageListeners.get(type);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(payload);
          } catch (e) {
            console.error('Message listener error:', e);
          }
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  getState(): PWAState {
    return { ...this.state };
  }

  isOnline(): boolean {
    return this.state.isOnline;
  }

  isUpdateAvailable(): boolean {
    return this.state.isUpdateAvailable;
  }

  isActivated(): boolean {
    return this.state.status === 'activated';
  }

  // ---------------------------------------------------------------------------
  // Listeners
  // ---------------------------------------------------------------------------

  subscribe(listener: (state: PWAState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onMessage(type: string, listener: (data: unknown) => void): () => void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, new Set());
    }
    this.messageListeners.get(type)!.add(listener);
    return () => this.messageListeners.get(type)?.delete(listener);
  }

  private updateState(partial: Partial<PWAState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (e) {
        console.error('State listener error:', e);
      }
    });
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let pwaServiceInstance: PWAService | null = null;

export function getPWAService(config?: Partial<PWAConfig>): PWAService {
  if (!pwaServiceInstance) {
    pwaServiceInstance = new PWAService(config);
  }
  return pwaServiceInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function usePWA(config?: Partial<PWAConfig>) {
  const [state, setState] = useState<PWAState>({
    status: 'unregistered',
    isOnline: true,
    isUpdateAvailable: false,
    registration: null,
  });

  useEffect(() => {
    const service = getPWAService(config);
    
    // Subscribe to state changes
    const unsubscribe = service.subscribe(setState);
    
    // Initial state
    setState(service.getState());
    
    // Register service worker
    service.register();
    
    return unsubscribe;
  }, []);

  const checkForUpdate = useCallback(async () => {
    const service = getPWAService();
    return service.checkForUpdate();
  }, []);

  const applyUpdate = useCallback(async () => {
    const service = getPWAService();
    return service.applyUpdate();
  }, []);

  const clearCache = useCallback(async (cacheName?: string) => {
    const service = getPWAService();
    return service.clearCache(cacheName);
  }, []);

  const getCacheStats = useCallback(async () => {
    const service = getPWAService();
    return service.getCacheStats();
  }, []);

  const cacheDocument = useCallback(async (url: string, content: string) => {
    const service = getPWAService();
    return service.cacheDocument(url, content);
  }, []);

  return {
    ...state,
    isSupported: getPWAService().isSupported(),
    checkForUpdate,
    applyUpdate,
    clearCache,
    getCacheStats,
    cacheDocument,
  };
}

export default PWAService;
