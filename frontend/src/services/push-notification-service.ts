
/**
 * Push Notification Service
 * Browser push notifications with service worker integration
 * 
 * v0.42.0 - Push Notification Integration
 */

// =============================================================================
// TYPES
// =============================================================================

export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushConfig {
  vapidPublicKey: string;
  serviceWorkerPath: string;
  apiEndpoint: string;
  defaultIcon: string;
  defaultBadge: string;
}

export interface PushEventHandlers {
  onNotificationClick?: (event: NotificationEvent) => void;
  onNotificationClose?: (event: NotificationEvent) => void;
  onPushReceived?: (payload: PushNotificationPayload) => void;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
  onPermissionChange?: (status: PushPermissionStatus) => void;
}

interface NotificationEvent {
  notification: Notification;
  action?: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: Partial<PushConfig> = {
  serviceWorkerPath: '/sw.js',
  apiEndpoint: '/api/push/subscribe',
  defaultIcon: '/icons/notification-icon.png',
  defaultBadge: '/icons/badge-icon.png',
};

// =============================================================================
// PUSH NOTIFICATION SERVICE
// =============================================================================

export class PushNotificationService {
  private config: PushConfig;
  private handlers: PushEventHandlers = {};
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private permissionStatus: PushPermissionStatus = 'default';

  constructor(config: Partial<PushConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config } as PushConfig;
    this.checkSupport();
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize the push notification service
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register(this.config.serviceWorkerPath);
      await navigator.serviceWorker.ready;

      // Check existing subscription
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = this.formatSubscription(existingSubscription);
        this.handlers.onSubscriptionChange?.(this.subscription);
      }

      // Check permission status
      this.permissionStatus = await this.checkPermission();
      this.handlers.onPermissionChange?.(this.permissionStatus);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      return true;
    } catch (error) {
      console.error('Push initialization error:', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Permission Management
  // ---------------------------------------------------------------------------

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<PushPermissionStatus> {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      this.permissionStatus = result as PushPermissionStatus;
      this.handlers.onPermissionChange?.(this.permissionStatus);
      return this.permissionStatus;
    } catch (error) {
      console.error('Permission request error:', error);
      return 'denied';
    }
  }

  /**
   * Check current permission status
   */
  async checkPermission(): Promise<PushPermissionStatus> {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return Notification.permission as PushPermissionStatus;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): PushPermissionStatus {
    return this.permissionStatus;
  }

  // ---------------------------------------------------------------------------
  // Subscription Management
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error('Service worker not registered');
      return null;
    }

    if (this.permissionStatus !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return null;
      }
    }

    try {
      // Convert VAPID key
      const applicationServerKey = this.urlBase64ToUint8Array(this.config.vapidPublicKey) as BufferSource;

      // Subscribe
      const pushSubscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      this.subscription = this.formatSubscription(pushSubscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);

      this.handlers.onSubscriptionChange?.(this.subscription);
      return this.subscription;
    } catch (error) {
      console.error('Subscription error:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const pushSubscription = await this.registration.pushManager.getSubscription();
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        
        // Notify server
        await this.removeSubscriptionFromServer(this.subscription!);
      }

      this.subscription = null;
      this.handlers.onSubscriptionChange?.(null);
      return true;
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return false;
    }
  }

  /**
   * Get current subscription
   */
  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  /**
   * Check if subscribed
   */
  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  // ---------------------------------------------------------------------------
  // Local Notifications
  // ---------------------------------------------------------------------------

  /**
   * Show a local notification (not pushed from server)
   */
  async showNotification(payload: PushNotificationPayload): Promise<boolean> {
    if (!this.registration || this.permissionStatus !== 'granted') {
      return false;
    }

    try {
      await this.registration.showNotification(payload.title, ({
        body: payload.body,
        icon: payload.icon || this.config.defaultIcon,
        badge: payload.badge || this.config.defaultBadge,
        image: payload.image,
        tag: payload.tag,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent,
        timestamp: payload.timestamp,
        vibrate: payload.vibrate,
      } as any));
      return true;
    } catch (error) {
      console.error('Show notification error:', error);
      return false;
    }
  }

  /**
   * Close notifications by tag
   */
  async closeNotifications(tag?: string): Promise<void> {
    if (!this.registration) return;

    const notifications = await this.registration.getNotifications({ tag });
    notifications.forEach(notification => notification.close());
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Set event handlers
   */
  setHandlers(handlers: PushEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, payload } = event.data || {};

    switch (type) {
      case 'NOTIFICATION_CLICK':
        this.handlers.onNotificationClick?.({
          notification: payload.notification,
          action: payload.action,
          data: payload.data,
        });
        break;

      case 'NOTIFICATION_CLOSE':
        this.handlers.onNotificationClose?.({
          notification: payload.notification,
          data: payload.data,
        });
        break;

      case 'PUSH_RECEIVED':
        this.handlers.onPushReceived?.(payload);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Server Communication
  // ---------------------------------------------------------------------------

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription,
        }),
      } as any);
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsubscribe',
          subscription,
        }),
      });
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private checkSupport(): void {
    if (typeof window === 'undefined') {
      this.permissionStatus = 'unsupported';
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      this.permissionStatus = 'unsupported';
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'PushManager' in window &&
           'Notification' in window;
  }

  private formatSubscription(sub: globalThis.PushSubscription): PushSubscription {
    const json = sub.toJSON();
    return {
      endpoint: json.endpoint!,
      keys: {
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      },
    };
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let pushServiceInstance: PushNotificationService | null = null;

export function getPushService(config?: Partial<PushConfig>): PushNotificationService {
  if (!pushServiceInstance && config) {
    pushServiceInstance = new PushNotificationService(config);
  }
  if (!pushServiceInstance) {
    throw new Error('Push service not initialized. Call with config first.');
  }
  return pushServiceInstance;
}

// =============================================================================
// SERVICE WORKER SCRIPT (to be saved as public/sw.js)
// =============================================================================

export const SERVICE_WORKER_SCRIPT = `
// Push Notification Service Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  
  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/notification-icon.png',
    badge: payload.badge || '/icons/badge-icon.png',
    image: payload.image,
    tag: payload.tag,
    data: payload.data,
    actions: payload.actions,
    requireInteraction: payload.requireInteraction,
    silent: payload.silent,
    vibrate: payload.vibrate,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );

  // Notify clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'PUSH_RECEIVED',
        payload,
      });
    });
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Notify clients
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing window or open new
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].postMessage({
          type: 'NOTIFICATION_CLICK',
          payload: {
            notification: {
              title: event.notification.title,
              body: event.notification.body,
              tag: event.notification.tag,
            },
            action,
            data,
          },
        });
      } else if (data.url) {
        self.clients.openWindow(data.url);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};

  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_CLOSE',
        payload: {
          notification: {
            title: event.notification.title,
            body: event.notification.body,
            tag: event.notification.tag,
          },
          data,
        },
      });
    });
  });
});
`;

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function usePushNotifications(config?: Partial<PushConfig>) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<PushPermissionStatus>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config?.vapidPublicKey) return;

    const service = getPushService(config);
    
    setIsSupported(service.isSupported());
    
    service.setHandlers({
      onPermissionChange: setPermission,
      onSubscriptionChange: (sub) => setIsSubscribed(!!sub),
    });

    service.initialize().then(() => {
      setPermission(service.getPermissionStatus());
      setIsSubscribed(service.isSubscribed());
    });
  }, [config]);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const service = getPushService();
      const subscription = await service.subscribe();
      setIsSubscribed(!!subscription);
      return !!subscription;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Subscription failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const service = getPushService();
      await service.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unsubscribe failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showNotification = useCallback(async (payload: PushNotificationPayload) => {
    try {
      const service = getPushService();
      return await service.showNotification(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Notification failed');
      return false;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    showNotification,
  };
}

export default PushNotificationService;
