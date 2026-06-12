
/**
 * Dashboard Widgets Service
 * Configurable widget system for resilience dashboards
 * 
 * v0.42.5 - Custom Dashboard Widgets
 * 
 * Features:
 * - Widget library with built-in types
 * - Custom widget creation
 * - Layout persistence
 * - Real-time data binding
 */

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type WidgetType = 
  | 'metric-card'
  | 'chart-line'
  | 'chart-bar'
  | 'chart-pie'
  | 'status-grid'
  | 'alert-list'
  | 'event-log'
  | 'health-indicator'
  | 'progress-bar'
  | 'table'
  | 'custom';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export type DataSourceType = 
  | 'circuit-breaker'
  | 'bulkhead'
  | 'rate-limiter'
  | 'storage'
  | 'executor'
  | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DataBinding {
  source: DataSourceType;
  sourceName?: string;         // Specific instance name
  field: string;               // Field to extract
  transform?: string;          // Optional transformation expression
  refreshInterval?: number;    // Override default refresh
}

export interface WidgetThreshold {
  value: number;
  color: string;
  label?: string;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: WidgetSize;
  position: WidgetPosition;
  dataBindings: DataBinding[];
  options: Record<string, unknown>;
  thresholds?: WidgetThreshold[];
  visible: boolean;
  refreshInterval: number;     // ms
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  columns: number;
  rowHeight: number;
  gap: number;
  createdAt: number;
  updatedAt: number;
  isDefault: boolean;
}

export interface WidgetTemplate {
  id: string;
  type: WidgetType;
  name: string;
  description: string;
  category: string;
  defaultConfig: Partial<WidgetConfig>;
  previewImage?: string;
  requiredDataSources: DataSourceType[];
}

export interface WidgetData {
  widgetId: string;
  timestamp: number;
  values: Record<string, unknown>;
  error?: string;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const SIZE_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
  small: { width: 1, height: 1 },
  medium: { width: 2, height: 1 },
  large: { width: 2, height: 2 },
  full: { width: 4, height: 2 },
};

const DEFAULT_LAYOUT: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Default Dashboard',
  widgets: [],
  columns: 4,
  rowHeight: 150,
  gap: 16,
  isDefault: true,
};

// =============================================================================
// BUILT-IN WIDGET TEMPLATES
// =============================================================================

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  // Metric Cards
  {
    id: 'metric-health',
    type: 'metric-card',
    name: 'System Health',
    description: 'Overall system health percentage',
    category: 'Metrics',
    defaultConfig: {
      title: 'System Health',
      size: 'small',
      dataBindings: [
        { source: 'custom', field: 'systemHealth' },
      ],
      options: {
        icon: 'activity',
        format: 'percent',
        colorByValue: true,
      },
      thresholds: [
        { value: 90, color: 'green', label: 'Healthy' },
        { value: 70, color: 'yellow', label: 'Warning' },
        { value: 0, color: 'red', label: 'Critical' },
      ],
    },
    requiredDataSources: [],
  },
  {
    id: 'metric-circuit-state',
    type: 'metric-card',
    name: 'Circuit State',
    description: 'Current circuit breaker state',
    category: 'Metrics',
    defaultConfig: {
      title: 'Circuit State',
      size: 'small',
      dataBindings: [
        { source: 'circuit-breaker', field: 'state' },
      ],
      options: {
        icon: 'zap',
        showTrend: false,
      },
    },
    requiredDataSources: ['circuit-breaker'],
  },
  {
    id: 'metric-error-rate',
    type: 'metric-card',
    name: 'Error Rate',
    description: 'Current error rate percentage',
    category: 'Metrics',
    defaultConfig: {
      title: 'Error Rate',
      size: 'small',
      dataBindings: [
        { source: 'executor', field: 'errorRate' },
      ],
      options: {
        icon: 'alert-triangle',
        format: 'percent',
        invertColors: true,
      },
      thresholds: [
        { value: 5, color: 'green' },
        { value: 20, color: 'yellow' },
        { value: 100, color: 'red' },
      ],
    },
    requiredDataSources: ['executor'],
  },
  {
    id: 'metric-throughput',
    type: 'metric-card',
    name: 'Throughput',
    description: 'Requests per second',
    category: 'Metrics',
    defaultConfig: {
      title: 'Throughput',
      size: 'small',
      dataBindings: [
        { source: 'rate-limiter', field: 'requestsPerSecond' },
      ],
      options: {
        icon: 'trending-up',
        format: 'number',
        suffix: '/s',
      },
    },
    requiredDataSources: ['rate-limiter'],
  },

  // Charts
  {
    id: 'chart-error-trend',
    type: 'chart-line',
    name: 'Error Trend',
    description: 'Error rate over time',
    category: 'Charts',
    defaultConfig: {
      title: 'Error Trend',
      size: 'medium',
      dataBindings: [
        { source: 'executor', field: 'errorRateHistory' },
      ],
      options: {
        xAxis: 'time',
        yAxis: 'percent',
        color: '#ef4444',
        fill: true,
        smooth: true,
      },
    },
    requiredDataSources: ['executor'],
  },
  {
    id: 'chart-latency',
    type: 'chart-line',
    name: 'Latency Distribution',
    description: 'Response time distribution',
    category: 'Charts',
    defaultConfig: {
      title: 'Latency',
      size: 'medium',
      dataBindings: [
        { source: 'executor', field: 'latencyHistory' },
      ],
      options: {
        xAxis: 'time',
        yAxis: 'ms',
        color: '#3b82f6',
        showP50: true,
        showP95: true,
        showP99: true,
      },
    },
    requiredDataSources: ['executor'],
  },
  {
    id: 'chart-circuit-states',
    type: 'chart-pie',
    name: 'Circuit States',
    description: 'Distribution of circuit breaker states',
    category: 'Charts',
    defaultConfig: {
      title: 'Circuit States',
      size: 'medium',
      dataBindings: [
        { source: 'circuit-breaker', field: 'stateDistribution' },
      ],
      options: {
        colors: {
          closed: '#22c55e',
          open: '#ef4444',
          'half-open': '#f59e0b',
        },
        showLegend: true,
      },
    },
    requiredDataSources: ['circuit-breaker'],
  },
  {
    id: 'chart-storage-usage',
    type: 'chart-bar',
    name: 'Storage Usage',
    description: 'Storage usage by store',
    category: 'Charts',
    defaultConfig: {
      title: 'Storage Usage',
      size: 'medium',
      dataBindings: [
        { source: 'storage', field: 'breakdown' },
      ],
      options: {
        orientation: 'horizontal',
        showValues: true,
        color: '#8b5cf6',
      },
    },
    requiredDataSources: ['storage'],
  },

  // Status Displays
  {
    id: 'status-circuits',
    type: 'status-grid',
    name: 'Circuit Grid',
    description: 'Grid view of all circuit breakers',
    category: 'Status',
    defaultConfig: {
      title: 'Circuit Breakers',
      size: 'large',
      dataBindings: [
        { source: 'circuit-breaker', field: 'all' },
      ],
      options: {
        columns: 3,
        showStats: true,
        stateColors: {
          closed: 'green',
          open: 'red',
          'half-open': 'yellow',
        },
      },
    },
    requiredDataSources: ['circuit-breaker'],
  },
  {
    id: 'status-bulkheads',
    type: 'status-grid',
    name: 'Bulkhead Grid',
    description: 'Grid view of all bulkheads',
    category: 'Status',
    defaultConfig: {
      title: 'Bulkheads',
      size: 'large',
      dataBindings: [
        { source: 'bulkhead', field: 'all' },
      ],
      options: {
        columns: 3,
        showUtilization: true,
        stateColors: {
          healthy: 'green',
          saturated: 'yellow',
          overloaded: 'red',
        },
      },
    },
    requiredDataSources: ['bulkhead'],
  },
  {
    id: 'health-overview',
    type: 'health-indicator',
    name: 'Health Overview',
    description: 'Visual health status indicator',
    category: 'Status',
    defaultConfig: {
      title: 'System Health',
      size: 'small',
      dataBindings: [
        { source: 'custom', field: 'overallHealth' },
      ],
      options: {
        style: 'traffic-light',
        showLabel: true,
        animate: true,
      },
    },
    requiredDataSources: [],
  },

  // Lists & Logs
  {
    id: 'alert-active',
    type: 'alert-list',
    name: 'Active Alerts',
    description: 'List of active alerts',
    category: 'Alerts',
    defaultConfig: {
      title: 'Active Alerts',
      size: 'medium',
      dataBindings: [
        { source: 'storage', field: 'alerts' },
      ],
      options: {
        maxItems: 10,
        showSeverity: true,
        showTimestamp: true,
        allowDismiss: true,
      },
    },
    requiredDataSources: ['storage'],
  },
  {
    id: 'event-recent',
    type: 'event-log',
    name: 'Recent Events',
    description: 'Stream of recent events',
    category: 'Logs',
    defaultConfig: {
      title: 'Event Log',
      size: 'large',
      dataBindings: [
        { source: 'executor', field: 'events' },
      ],
      options: {
        maxItems: 50,
        showTimestamp: true,
        groupByType: false,
        autoScroll: true,
      },
    },
    requiredDataSources: ['executor'],
  },

  // Progress & Capacity
  {
    id: 'progress-capacity',
    type: 'progress-bar',
    name: 'Capacity Usage',
    description: 'Current capacity utilization',
    category: 'Capacity',
    defaultConfig: {
      title: 'Capacity',
      size: 'medium',
      dataBindings: [
        { source: 'bulkhead', field: 'utilization' },
      ],
      options: {
        showLabel: true,
        showValue: true,
        animated: true,
      },
      thresholds: [
        { value: 80, color: 'green' },
        { value: 90, color: 'yellow' },
        { value: 100, color: 'red' },
      ],
    },
    requiredDataSources: ['bulkhead'],
  },
  {
    id: 'progress-rate-limit',
    type: 'progress-bar',
    name: 'Rate Limit Usage',
    description: 'Current rate limit consumption',
    category: 'Capacity',
    defaultConfig: {
      title: 'Rate Limit',
      size: 'medium',
      dataBindings: [
        { source: 'rate-limiter', field: 'consumedPercent' },
      ],
      options: {
        showLabel: true,
        showRemaining: true,
        resetCountdown: true,
      },
    },
    requiredDataSources: ['rate-limiter'],
  },

  // Tables
  {
    id: 'table-executors',
    type: 'table',
    name: 'Executor Stats',
    description: 'Detailed executor statistics',
    category: 'Tables',
    defaultConfig: {
      title: 'Executor Statistics',
      size: 'full',
      dataBindings: [
        { source: 'executor', field: 'allStats' },
      ],
      options: {
        columns: ['name', 'state', 'executions', 'failures', 'retries', 'avgDuration'],
        sortable: true,
        filterable: true,
        pageSize: 10,
      },
    },
    requiredDataSources: ['executor'],
  },
];

// =============================================================================
// DASHBOARD WIDGETS SERVICE
// =============================================================================

class DashboardWidgetsService {
  private layouts: Map<string, DashboardLayout> = new Map();
  private activeLayoutId: string | null = null;
  private widgetData: Map<string, WidgetData> = new Map();
  private dataFetchers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // ---------------------------------------------------------------------------
  // LAYOUT MANAGEMENT
  // ---------------------------------------------------------------------------

  createLayout(name: string, description?: string): DashboardLayout {
    const layout: DashboardLayout = {
      ...DEFAULT_LAYOUT,
      id: `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: this.layouts.size === 0,
    };

    this.layouts.set(layout.id, layout);
    this.saveToStorage();
    this.notifyListeners();
    return layout;
  }

  getLayout(id: string): DashboardLayout | undefined {
    return this.layouts.get(id);
  }

  getActiveLayout(): DashboardLayout | undefined {
    if (!this.activeLayoutId) {
      // Return default layout
      for (const layout of Array.from(Array.from(Array.from(Array.from(Array.from(this.layouts.values())))))) {
        if (layout.isDefault) return layout;
      }
      // Create default if none exists
      return this.createLayout('Default Dashboard');
    }
    return this.layouts.get(this.activeLayoutId);
  }

  setActiveLayout(id: string): void {
    if (this.layouts.has(id)) {
      this.activeLayoutId = id;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  updateLayout(id: string, updates: Partial<DashboardLayout>): DashboardLayout | undefined {
    const layout = this.layouts.get(id);
    if (!layout) return undefined;

    const updated = {
      ...layout,
      ...updates,
      id: layout.id, // Prevent ID change
      updatedAt: Date.now(),
    };

    this.layouts.set(id, updated);
    this.saveToStorage();
    this.notifyListeners();
    return updated;
  }

  deleteLayout(id: string): boolean {
    const layout = this.layouts.get(id);
    if (!layout) return false;

    // Can't delete default layout if it's the only one
    if (layout.isDefault && this.layouts.size === 1) {
      return false;
    }

    this.layouts.delete(id);

    // If deleted layout was active, switch to default
    if (this.activeLayoutId === id) {
      this.activeLayoutId = null;
    }

    // If deleted layout was default, make another default
    if (layout.isDefault) {
      const first = Array.from(this.layouts.values())[0];
      if (first) {
        first.isDefault = true;
      }
    }

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  duplicateLayout(id: string, newName: string): DashboardLayout | undefined {
    const source = this.layouts.get(id);
    if (!source) return undefined;

    const duplicate: DashboardLayout = {
      ...JSON.parse(JSON.stringify(source)),
      id: `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: false,
    };

    // Update widget IDs
    duplicate.widgets = duplicate.widgets.map(w => ({
      ...w,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }));

    this.layouts.set(duplicate.id, duplicate);
    this.saveToStorage();
    this.notifyListeners();
    return duplicate;
  }

  getAllLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values());
  }

  // ---------------------------------------------------------------------------
  // WIDGET MANAGEMENT
  // ---------------------------------------------------------------------------

  addWidget(
    layoutId: string,
    template: WidgetTemplate | string,
    position?: Partial<WidgetPosition>
  ): WidgetConfig | undefined {
    const layout = this.layouts.get(layoutId);
    if (!layout) return undefined;

    const tmpl = typeof template === 'string'
      ? WIDGET_TEMPLATES.find(t => t.id === template)
      : template;

    if (!tmpl) return undefined;

    const sizeDims = SIZE_DIMENSIONS[tmpl.defaultConfig.size || 'small'];
    const calculatedPosition = position
      ? { ...sizeDims, x: 0, y: 0, ...position }
      : this.findNextPosition(layout, sizeDims);

    const widget: WidgetConfig = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: tmpl.type,
      title: tmpl.defaultConfig.title || tmpl.name,
      description: tmpl.description,
      size: tmpl.defaultConfig.size || 'small',
      position: calculatedPosition,
      dataBindings: tmpl.defaultConfig.dataBindings || [],
      options: tmpl.defaultConfig.options || {},
      thresholds: tmpl.defaultConfig.thresholds,
      visible: true,
      refreshInterval: tmpl.defaultConfig.refreshInterval || 2000,
    };

    layout.widgets.push(widget);
    layout.updatedAt = Date.now();
    this.saveToStorage();
    this.notifyListeners();

    // Start data fetching
    this.startWidgetDataFetcher(widget);

    return widget;
  }

  updateWidget(
    layoutId: string,
    widgetId: string,
    updates: Partial<WidgetConfig>
  ): WidgetConfig | undefined {
    const layout = this.layouts.get(layoutId);
    if (!layout) return undefined;

    const widgetIndex = layout.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return undefined;

    const updated = {
      ...layout.widgets[widgetIndex],
      ...updates,
      id: widgetId, // Prevent ID change
    };

    layout.widgets[widgetIndex] = updated;
    layout.updatedAt = Date.now();
    this.saveToStorage();
    this.notifyListeners();

    // Restart data fetcher if interval changed
    if (updates.refreshInterval !== undefined) {
      this.stopWidgetDataFetcher(widgetId);
      this.startWidgetDataFetcher(updated);
    }

    return updated;
  }

  removeWidget(layoutId: string, widgetId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const initialLength = layout.widgets.length;
    layout.widgets = layout.widgets.filter(w => w.id !== widgetId);

    if (layout.widgets.length < initialLength) {
      layout.updatedAt = Date.now();
      this.saveToStorage();
      this.notifyListeners();
      this.stopWidgetDataFetcher(widgetId);
      return true;
    }

    return false;
  }

  moveWidget(
    layoutId: string,
    widgetId: string,
    position: Partial<WidgetPosition>
  ): WidgetConfig | undefined {
    return this.updateWidget(layoutId, widgetId, {
      position: {
        ...this.layouts.get(layoutId)?.widgets.find(w => w.id === widgetId)?.position,
        ...position,
      } as WidgetPosition,
    });
  }

  resizeWidget(
    layoutId: string,
    widgetId: string,
    size: WidgetSize
  ): WidgetConfig | undefined {
    const dims = SIZE_DIMENSIONS[size];
    return this.updateWidget(layoutId, widgetId, {
      size,
      position: {
        ...this.layouts.get(layoutId)?.widgets.find(w => w.id === widgetId)?.position,
        ...dims,
      } as WidgetPosition,
    });
  }

  private findNextPosition(
    layout: DashboardLayout,
    dims: { width: number; height: number }
  ): WidgetPosition {
    // Simple algorithm: find first empty spot scanning left-to-right, top-to-bottom
    const grid: boolean[][] = [];
    const maxRows = 100; // Arbitrary max

    // Initialize grid
    for (let y = 0; y < maxRows; y++) {
      grid[y] = new Array(layout.columns).fill(false);
    }

    // Mark occupied cells
    for (const widget of layout.widgets) {
      for (let dy = 0; dy < widget.position.height; dy++) {
        for (let dx = 0; dx < widget.position.width; dx++) {
          const y = widget.position.y + dy;
          const x = widget.position.x + dx;
          if (y < maxRows && x < layout.columns) {
            grid[y][x] = true;
          }
        }
      }
    }

    // Find first fitting position
    for (let y = 0; y < maxRows - dims.height + 1; y++) {
      for (let x = 0; x <= layout.columns - dims.width; x++) {
        let fits = true;
        for (let dy = 0; dy < dims.height && fits; dy++) {
          for (let dx = 0; dx < dims.width && fits; dx++) {
            if (grid[y + dy][x + dx]) {
              fits = false;
            }
          }
        }
        if (fits) {
          return { x, y, width: dims.width, height: dims.height };
        }
      }
    }

    // Default to bottom
    return { x: 0, y: maxRows, width: dims.width, height: dims.height };
  }

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------

  private startWidgetDataFetcher(widget: WidgetConfig): void {
    if (this.dataFetchers.has(widget.id)) return;

    const fetcher = setInterval(() => {
      this.fetchWidgetData(widget);
    }, widget.refreshInterval);

    this.dataFetchers.set(widget.id, fetcher);
    
    // Initial fetch
    this.fetchWidgetData(widget);
  }

  private stopWidgetDataFetcher(widgetId: string): void {
    const fetcher = this.dataFetchers.get(widgetId);
    if (fetcher) {
      clearInterval(fetcher);
      this.dataFetchers.delete(widgetId);
    }
  }

  private async fetchWidgetData(widget: WidgetConfig): Promise<void> {
    const values: Record<string, unknown> = {};

    for (const binding of widget.dataBindings) {
      try {
        const value = await this.fetchDataSource(binding);
        values[binding.field] = value;
      } catch (error) {
        values[binding.field] = null;
      }
    }

    this.widgetData.set(widget.id, {
      widgetId: widget.id,
      timestamp: Date.now(),
      values,
    });

    this.notifyListeners();
  }

  private async fetchDataSource(binding: DataBinding): Promise<unknown> {
    // In a real implementation, this would fetch from actual services
    // For now, return mock data based on source type
    switch (binding.source) {
      case 'circuit-breaker':
        return this.mockCircuitBreakerData(binding.field);
      case 'bulkhead':
        return this.mockBulkheadData(binding.field);
      case 'rate-limiter':
        return this.mockRateLimiterData(binding.field);
      case 'storage':
        return this.mockStorageData(binding.field);
      case 'executor':
        return this.mockExecutorData(binding.field);
      case 'custom':
        return this.mockCustomData(binding.field);
      default:
        return null;
    }
  }

  private mockCircuitBreakerData(field: string): unknown {
    const states = ['closed', 'open', 'half-open'];
    switch (field) {
      case 'state':
        return states[Math.floor(Math.random() * 3)];
      case 'stateDistribution':
        return { closed: 5, open: 1, 'half-open': 2 };
      case 'all':
        return [
          { name: 'api-service', state: 'closed', failures: 2 },
          { name: 'db-service', state: 'closed', failures: 0 },
          { name: 'cache-service', state: 'open', failures: 5 },
        ];
      default:
        return null;
    }
  }

  private mockBulkheadData(field: string): unknown {
    switch (field) {
      case 'utilization':
        return Math.floor(Math.random() * 100);
      case 'all':
        return [
          { name: 'api-pool', state: 'healthy', active: 5, max: 10 },
          { name: 'db-pool', state: 'saturated', active: 9, max: 10 },
          { name: 'worker-pool', state: 'healthy', active: 2, max: 20 },
        ];
      default:
        return null;
    }
  }

  private mockRateLimiterData(field: string): unknown {
    switch (field) {
      case 'requestsPerSecond':
        return Math.floor(Math.random() * 100);
      case 'consumedPercent':
        return Math.floor(Math.random() * 100);
      default:
        return null;
    }
  }

  private mockStorageData(field: string): unknown {
    switch (field) {
      case 'breakdown':
        return [
          { name: 'documents', size: 1024000 },
          { name: 'cache', size: 512000 },
          { name: 'state', size: 256000 },
        ];
      case 'alerts':
        return [
          { id: '1', message: 'Storage nearing capacity', severity: 'warning', timestamp: Date.now() },
        ];
      default:
        return null;
    }
  }

  private mockExecutorData(field: string): unknown {
    switch (field) {
      case 'errorRate':
        return Math.floor(Math.random() * 20);
      case 'errorRateHistory':
        return Array.from({ length: 20 }, (_, i) => ({
          time: Date.now() - (20 - i) * 60000,
          value: Math.floor(Math.random() * 20),
        }));
      case 'latencyHistory':
        return Array.from({ length: 20 }, (_, i) => ({
          time: Date.now() - (20 - i) * 60000,
          p50: 50 + Math.random() * 50,
          p95: 100 + Math.random() * 100,
          p99: 200 + Math.random() * 200,
        }));
      case 'events':
        return [
          { type: 'success', timestamp: Date.now() - 1000 },
          { type: 'retry', timestamp: Date.now() - 2000 },
          { type: 'failure', timestamp: Date.now() - 5000 },
        ];
      case 'allStats':
        return [
          { name: 'api', state: 'closed', executions: 1000, failures: 5, retries: 10, avgDuration: 45 },
          { name: 'db', state: 'closed', executions: 500, failures: 2, retries: 5, avgDuration: 120 },
        ];
      default:
        return null;
    }
  }

  private mockCustomData(field: string): unknown {
    switch (field) {
      case 'systemHealth':
      case 'overallHealth':
        return 85 + Math.floor(Math.random() * 15);
      default:
        return null;
    }
  }

  getWidgetData(widgetId: string): WidgetData | undefined {
    return this.widgetData.get(widgetId);
  }

  getAllWidgetData(): Map<string, WidgetData> {
    return new Map(this.widgetData);
  }

  // ---------------------------------------------------------------------------
  // TEMPLATES
  // ---------------------------------------------------------------------------

  getTemplates(): WidgetTemplate[] {
    return [...WIDGET_TEMPLATES];
  }

  getTemplatesByCategory(): Map<string, WidgetTemplate[]> {
    const categories = new Map<string, WidgetTemplate[]>();
    
    for (const template of WIDGET_TEMPLATES) {
      const existing = categories.get(template.category) || [];
      existing.push(template);
      categories.set(template.category, existing);
    }
    
    return categories;
  }

  getTemplate(id: string): WidgetTemplate | undefined {
    return WIDGET_TEMPLATES.find(t => t.id === id);
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------------------

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ligature:dashboard-layouts');
      if (stored) {
        const data = JSON.parse(stored);
        this.layouts = new Map(data.layouts.map((l: DashboardLayout) => [l.id, l]));
        this.activeLayoutId = data.activeLayoutId;
      }
    } catch (error) {
      console.warn('Failed to load dashboard layouts:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        layouts: Array.from(this.layouts.values()),
        activeLayoutId: this.activeLayoutId,
      };
      localStorage.setItem('ligature:dashboard-layouts', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save dashboard layouts:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  initializeDefaultLayout(): DashboardLayout {
    const layout = this.createLayout('Resilience Dashboard', 'Default resilience monitoring dashboard');

    // Add default widgets
    this.addWidget(layout.id, 'metric-health', { x: 0, y: 0 });
    this.addWidget(layout.id, 'metric-error-rate', { x: 1, y: 0 });
    this.addWidget(layout.id, 'metric-throughput', { x: 2, y: 0 });
    this.addWidget(layout.id, 'health-overview', { x: 3, y: 0 });
    this.addWidget(layout.id, 'chart-error-trend', { x: 0, y: 1 });
    this.addWidget(layout.id, 'chart-latency', { x: 2, y: 1 });
    this.addWidget(layout.id, 'status-circuits', { x: 0, y: 2 });
    this.addWidget(layout.id, 'alert-active', { x: 2, y: 2 });

    return layout;
  }
}

// Singleton instance
export const dashboardWidgetsService = new DashboardWidgetsService();

// =============================================================================
// REACT HOOKS
// =============================================================================

export function useDashboardLayouts() {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [activeLayout, setActiveLayout] = useState<DashboardLayout | undefined>();

  useEffect(() => {
    const update = () => {
      setLayouts(dashboardWidgetsService.getAllLayouts());
      setActiveLayout(dashboardWidgetsService.getActiveLayout());
    };

    update();
    return dashboardWidgetsService.subscribe(update);
  }, []);

  const createLayout = useCallback((name: string, description?: string) => {
    return dashboardWidgetsService.createLayout(name, description);
  }, []);

  const selectLayout = useCallback((id: string) => {
    dashboardWidgetsService.setActiveLayout(id);
  }, []);

  const deleteLayout = useCallback((id: string) => {
    return dashboardWidgetsService.deleteLayout(id);
  }, []);

  const duplicateLayout = useCallback((id: string, newName: string) => {
    return dashboardWidgetsService.duplicateLayout(id, newName);
  }, []);

  return {
    layouts,
    activeLayout,
    createLayout,
    selectLayout,
    deleteLayout,
    duplicateLayout,
  };
}

export function useDashboardWidgets(layoutId?: string) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [widgetData, setWidgetData] = useState<Map<string, WidgetData>>(new Map());

  useEffect(() => {
    const update = () => {
      const layout = layoutId
        ? dashboardWidgetsService.getLayout(layoutId)
        : dashboardWidgetsService.getActiveLayout();
      
      setWidgets(layout?.widgets || []);
      setWidgetData(dashboardWidgetsService.getAllWidgetData());
    };

    update();
    return dashboardWidgetsService.subscribe(update);
  }, [layoutId]);

  const addWidget = useCallback((templateId: string, position?: Partial<WidgetPosition>) => {
    const layout = layoutId
      ? dashboardWidgetsService.getLayout(layoutId)
      : dashboardWidgetsService.getActiveLayout();
    
    if (layout) {
      return dashboardWidgetsService.addWidget(layout.id, templateId, position);
    }
    return undefined;
  }, [layoutId]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    const layout = layoutId
      ? dashboardWidgetsService.getLayout(layoutId)
      : dashboardWidgetsService.getActiveLayout();
    
    if (layout) {
      return dashboardWidgetsService.updateWidget(layout.id, widgetId, updates);
    }
    return undefined;
  }, [layoutId]);

  const removeWidget = useCallback((widgetId: string) => {
    const layout = layoutId
      ? dashboardWidgetsService.getLayout(layoutId)
      : dashboardWidgetsService.getActiveLayout();
    
    if (layout) {
      return dashboardWidgetsService.removeWidget(layout.id, widgetId);
    }
    return false;
  }, [layoutId]);

  const moveWidget = useCallback((widgetId: string, position: Partial<WidgetPosition>) => {
    const layout = layoutId
      ? dashboardWidgetsService.getLayout(layoutId)
      : dashboardWidgetsService.getActiveLayout();
    
    if (layout) {
      return dashboardWidgetsService.moveWidget(layout.id, widgetId, position);
    }
    return undefined;
  }, [layoutId]);

  const getWidgetData = useCallback((widgetId: string) => {
    return widgetData.get(widgetId);
  }, [widgetData]);

  return {
    widgets,
    widgetData,
    addWidget,
    updateWidget,
    removeWidget,
    moveWidget,
    getWidgetData,
    templates: dashboardWidgetsService.getTemplates(),
    templatesByCategory: dashboardWidgetsService.getTemplatesByCategory(),
  };
}
