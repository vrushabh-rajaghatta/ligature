
/**
 * Storage Analytics Service
 * Track and analyze storage usage trends over time
 * 
 * v0.42.3 - Storage Analytics
 */

import { getIndexedDB } from './indexeddb-service';
import { getStorageQuotaService, StorageQuota, StorageBreakdown } from './storage-quota-service';

// =============================================================================
// TYPES
// =============================================================================

export interface StorageSnapshot {
  id: string;
  timestamp: number;
  quota: StorageQuota;
  breakdown: StorageBreakdown;
  events: StorageEvent[];
}

export interface StorageEvent {
  id: string;
  timestamp: number;
  type: 'write' | 'delete' | 'clear' | 'cleanup';
  store: string;
  itemCount: number;
  sizeChange: number;  // Positive = added, negative = removed
  metadata?: Record<string, any>;
}

export interface StorageTrend {
  period: 'hour' | 'day' | 'week' | 'month';
  dataPoints: TrendDataPoint[];
  summary: TrendSummary;
}

export interface TrendDataPoint {
  timestamp: number;
  used: number;
  available: number;
  usedPercent: number;
  breakdown: Record<string, number>;
}

export interface TrendSummary {
  avgUsage: number;
  maxUsage: number;
  minUsage: number;
  growthRate: number;        // Bytes per day
  projectedFull?: number;    // Timestamp when storage will be full
  largestStore: string;
  fastestGrowing: string;
}

export interface StorageAlert {
  id: string;
  timestamp: number;
  type: 'threshold' | 'rapid-growth' | 'quota-change' | 'cleanup-needed';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data?: Record<string, any>;
  acknowledged: boolean;
}

export interface AnalyticsConfig {
  snapshotInterval: number;     // ms (default: 1 hour)
  maxSnapshots: number;         // Max stored (default: 720 = 30 days hourly)
  trackEvents: boolean;
  maxEvents: number;
  alertThresholds: {
    warning: number;
    critical: number;
    rapidGrowthPercent: number; // % growth in 24h to trigger alert
  };
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: AnalyticsConfig = {
  snapshotInterval: 60 * 60 * 1000, // 1 hour
  maxSnapshots: 720,                 // 30 days
  trackEvents: true,
  maxEvents: 1000,
  alertThresholds: {
    warning: 80,
    critical: 95,
    rapidGrowthPercent: 20,
  },
};

// =============================================================================
// STORAGE ANALYTICS SERVICE
// =============================================================================

export class StorageAnalyticsService {
  private config: AnalyticsConfig;
  private snapshotTimer: NodeJS.Timeout | null = null;
  private eventBuffer: StorageEvent[] = [];
  private alertListeners: Set<(alert: StorageAlert) => void> = new Set();
  private eventIdCounter = 0;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  async init(): Promise<void> {
    await this.ensureStore();
    this.startSnapshotTimer();
    await this.takeSnapshot();
  }

  destroy(): void {
    this.stopSnapshotTimer();
  }

  private async ensureStore(): Promise<void> {
    const db = getIndexedDB();
    await db.init();
  }

  // ---------------------------------------------------------------------------
  // Snapshots
  // ---------------------------------------------------------------------------

  async takeSnapshot(): Promise<StorageSnapshot> {
    const quotaService = getStorageQuotaService();
    const quota = await quotaService.getQuota();
    const breakdown = await quotaService.getBreakdown();

    const snapshot: StorageSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: Date.now(),
      quota,
      breakdown,
      events: [...this.eventBuffer],
    };

    // Store snapshot
    const db = getIndexedDB();
    await db.put('cache', {
      key: snapshot.id,
      value: snapshot,
      type: 'storage-snapshot',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Clear event buffer
    this.eventBuffer = [];

    // Trim old snapshots
    await this.trimSnapshots();

    // Check for alerts
    await this.checkAlerts(snapshot);

    return snapshot;
  }

  async getSnapshots(limit?: number): Promise<StorageSnapshot[]> {
    const db = getIndexedDB();
    const entries = await db.query<{ value: StorageSnapshot }>('cache', 'by-type', 'storage-snapshot');
    
    return entries
      .map(e => e.value)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit || this.config.maxSnapshots);
  }

  private async trimSnapshots(): Promise<void> {
    const db = getIndexedDB();
    const entries = await db.query<{ key: string; createdAt: number }>('cache', 'by-type', 'storage-snapshot');
    
    if (entries.length > this.config.maxSnapshots) {
      const sorted = entries.sort((a, b) => a.createdAt - b.createdAt);
      const toDelete = sorted.slice(0, entries.length - this.config.maxSnapshots);
      await db.deleteMany('cache', toDelete.map(e => e.key));
    }
  }

  private startSnapshotTimer(): void {
    this.stopSnapshotTimer();
    this.snapshotTimer = setInterval(() => {
      this.takeSnapshot();
    }, this.config.snapshotInterval);
  }

  private stopSnapshotTimer(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Event Tracking
  // ---------------------------------------------------------------------------

  trackEvent(event: Omit<StorageEvent, 'id' | 'timestamp'>): void {
    if (!this.config.trackEvents) return;

    const fullEvent: StorageEvent = {
      ...event,
      id: `event-${++this.eventIdCounter}`,
      timestamp: Date.now(),
    };

    this.eventBuffer.push(fullEvent);

    // Trim buffer if needed
    if (this.eventBuffer.length > this.config.maxEvents) {
      this.eventBuffer = this.eventBuffer.slice(-this.config.maxEvents);
    }
  }

  async getEvents(since?: number): Promise<StorageEvent[]> {
    const snapshots = await this.getSnapshots();
    const allEvents = snapshots.flatMap(s => s.events);
    
    if (since) {
      return allEvents.filter(e => e.timestamp >= since);
    }
    
    return allEvents;
  }

  // ---------------------------------------------------------------------------
  // Trend Analysis
  // ---------------------------------------------------------------------------

  async getTrend(period: StorageTrend['period']): Promise<StorageTrend> {
    const snapshots = await this.getSnapshots();
    const now = Date.now();

    // Filter snapshots for period
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    }[period];

    const periodSnapshots = snapshots.filter(s => now - s.timestamp <= periodMs);

    // Generate data points
    const dataPoints: TrendDataPoint[] = periodSnapshots.map(s => ({
      timestamp: s.timestamp,
      used: s.quota.used,
      available: s.quota.available,
      usedPercent: s.quota.usedPercent,
      breakdown: Object.fromEntries(
        Object.entries(s.breakdown.stores).map(([k, v]) => [k, v.estimatedSize])
      ),
    }));

    // Calculate summary
    const summary = this.calculateTrendSummary(dataPoints, period);

    return {
      period,
      dataPoints,
      summary,
    };
  }

  private calculateTrendSummary(dataPoints: TrendDataPoint[], period: string): TrendSummary {
    if (dataPoints.length === 0) {
      return {
        avgUsage: 0,
        maxUsage: 0,
        minUsage: 0,
        growthRate: 0,
        largestStore: '',
        fastestGrowing: '',
      };
    }

    const usages = dataPoints.map(d => d.used);
    const avgUsage = usages.reduce((a, b) => a + b, 0) / usages.length;
    const maxUsage = Math.max(...usages);
    const minUsage = Math.min(...usages);

    // Calculate growth rate (bytes per day)
    let growthRate = 0;
    let projectedFull: number | undefined;
    
    if (dataPoints.length >= 2) {
      const oldest = dataPoints[dataPoints.length - 1];
      const newest = dataPoints[0];
      const timeDiff = newest.timestamp - oldest.timestamp;
      const sizeDiff = newest.used - oldest.used;
      
      if (timeDiff > 0) {
        growthRate = (sizeDiff / timeDiff) * 24 * 60 * 60 * 1000; // Per day
        
        // Project when full
        const remaining = newest.available || 0;
        if (growthRate > 0 && remaining > 0) {
          const daysUntilFull = remaining / growthRate;
          projectedFull = Date.now() + daysUntilFull * 24 * 60 * 60 * 1000;
        }
      }
    }

    // Find largest and fastest growing stores
    const latest = dataPoints[0];
    let largestStore = '';
    let largestSize = 0;
    
    for (const [store, size] of Object.entries(latest?.breakdown || {})) {
      if (size > largestSize) {
        largestSize = size;
        largestStore = store;
      }
    }

    // Calculate store growth rates
    let fastestGrowing = '';
    let fastestGrowthRate = 0;
    
    if (dataPoints.length >= 2) {
      const oldest = dataPoints[dataPoints.length - 1];
      for (const store of Object.keys(latest.breakdown)) {
        const oldSize = oldest.breakdown[store] || 0;
        const newSize = latest.breakdown[store] || 0;
        const growth = newSize - oldSize;
        if (growth > fastestGrowthRate) {
          fastestGrowthRate = growth;
          fastestGrowing = store;
        }
      }
    }

    return {
      avgUsage,
      maxUsage,
      minUsage,
      growthRate,
      projectedFull,
      largestStore,
      fastestGrowing,
    };
  }

  // ---------------------------------------------------------------------------
  // Alerts
  // ---------------------------------------------------------------------------

  private async checkAlerts(snapshot: StorageSnapshot): Promise<void> {
    const alerts: StorageAlert[] = [];

    // Threshold alerts
    if (snapshot.quota.usedPercent >= this.config.alertThresholds.critical) {
      alerts.push({
        id: `alert-${Date.now()}-critical`,
        timestamp: Date.now(),
        type: 'threshold',
        severity: 'critical',
        message: `Storage critically full: ${snapshot.quota.usedPercent.toFixed(1)}%`,
        data: { usedPercent: snapshot.quota.usedPercent },
        acknowledged: false,
      });
    } else if (snapshot.quota.usedPercent >= this.config.alertThresholds.warning) {
      alerts.push({
        id: `alert-${Date.now()}-warning`,
        timestamp: Date.now(),
        type: 'threshold',
        severity: 'warning',
        message: `Storage usage high: ${snapshot.quota.usedPercent.toFixed(1)}%`,
        data: { usedPercent: snapshot.quota.usedPercent },
        acknowledged: false,
      });
    }

    // Rapid growth detection
    const trend = await this.getTrend('day');
    if (trend.dataPoints.length >= 2) {
      const oldest = trend.dataPoints[trend.dataPoints.length - 1];
      const newest = trend.dataPoints[0];
      const growthPercent = ((newest.used - oldest.used) / (oldest.used || 1)) * 100;
      
      if (growthPercent >= this.config.alertThresholds.rapidGrowthPercent) {
        alerts.push({
          id: `alert-${Date.now()}-growth`,
          timestamp: Date.now(),
          type: 'rapid-growth',
          severity: 'warning',
          message: `Rapid storage growth: ${growthPercent.toFixed(1)}% in 24h`,
          data: { growthPercent, growthRate: trend.summary.growthRate },
          acknowledged: false,
        });
      }
    }

    // Store alerts
    if (alerts.length > 0) {
      const db = getIndexedDB();
      for (const alert of alerts) {
        await db.put('cache', {
          key: alert.id,
          value: alert,
          type: 'storage-alert',
          createdAt: Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        // Notify listeners
        this.alertListeners.forEach(l => l(alert));
      }
    }
  }

  async getAlerts(unacknowledgedOnly?: boolean): Promise<StorageAlert[]> {
    const db = getIndexedDB();
    const entries = await db.query<{ value: StorageAlert }>('cache', 'by-type', 'storage-alert');
    
    let alerts = entries.map(e => e.value);
    
    if (unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const db = getIndexedDB();
    const entry = await db.get<{ key: string; value: StorageAlert }>('cache', alertId);
    
    if (entry) {
      entry.value.acknowledged = true;
      await db.put('cache', entry);
    }
  }

  onAlert(listener: (alert: StorageAlert) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  async generateReport(): Promise<{
    current: StorageQuota;
    trends: Record<StorageTrend['period'], StorageTrend>;
    alerts: StorageAlert[];
    recommendations: string[];
  }> {
    const quotaService = getStorageQuotaService();
    const current = await quotaService.getQuota();
    
    const trends: Record<StorageTrend['period'], StorageTrend> = {
      hour: await this.getTrend('hour'),
      day: await this.getTrend('day'),
      week: await this.getTrend('week'),
      month: await this.getTrend('month'),
    };
    
    const alerts = await this.getAlerts(true);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (current.usedPercent > 80) {
      recommendations.push('Consider running cleanup to free up space');
    }
    
    if (trends.day.summary.growthRate > 10 * 1024 * 1024) {
      recommendations.push(`Storage growing rapidly (${this.formatBytes(trends.day.summary.growthRate)}/day)`);
    }
    
    if (trends.week.summary.projectedFull) {
      const daysUntilFull = Math.ceil((trends.week.summary.projectedFull - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysUntilFull < 30) {
        recommendations.push(`At current rate, storage will be full in ~${daysUntilFull} days`);
      }
    }
    
    if (trends.day.summary.largestStore) {
      recommendations.push(`Largest store: ${trends.day.summary.largestStore} - consider cleaning old data`);
    }
    
    if (!current.isPersisted) {
      recommendations.push('Request persistent storage to prevent data loss');
    }
    
    return { current, trends, alerts, recommendations };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let analyticsInstance: StorageAnalyticsService | null = null;

export function getStorageAnalytics(config?: Partial<AnalyticsConfig>): StorageAnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new StorageAnalyticsService(config);
  }
  return analyticsInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useStorageAnalytics() {
  const [isReady, setIsReady] = useState(false);
  const [trend, setTrend] = useState<StorageTrend | null>(null);
  const [alerts, setAlerts] = useState<StorageAlert[]>([]);
  const [period, setPeriod] = useState<StorageTrend['period']>('day');
  const service = getStorageAnalytics();

  useEffect(() => {
    service.init().then(() => setIsReady(true));
    
    const unsubscribe = service.onAlert(alert => {
      setAlerts(prev => [alert, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [service]);

  useEffect(() => {
    if (!isReady) return;
    service.getTrend(period).then(setTrend);
    service.getAlerts(true).then(setAlerts);
  }, [isReady, period, service]);

  const refresh = useCallback(async () => {
    await service.takeSnapshot();
    setTrend(await service.getTrend(period));
    setAlerts(await service.getAlerts(true));
  }, [service, period]);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    await service.acknowledgeAlert(alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, [service]);

  const generateReport = useCallback(() => {
    return service.generateReport();
  }, [service]);

  return {
    isReady,
    trend,
    alerts,
    period,
    setPeriod,
    refresh,
    acknowledgeAlert,
    generateReport,
    trackEvent: service.trackEvent.bind(service),
  };
}

export default StorageAnalyticsService;
