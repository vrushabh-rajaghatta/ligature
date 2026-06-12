// =============================================================================
// PROACTIVE MONITOR STORE — v0.109.0 (Phase 5)
// =============================================================================
// Server-side in-memory store for proactive monitors and their scan history.
// Agents shift from reactive (triggered) to proactive — monitors surface risks
// without being asked, using threshold checks and scheduled scans.
// =============================================================================

import type { ProactiveMonitor, ProactiveScan } from '@/types/agents';

// ── In-memory stores ──────────────────────────────────────────────────────────

const monitors = new Map<string, ProactiveMonitor>();
const scans = new Map<string, ProactiveScan>();

// ── ID generators ─────────────────────────────────────────────────────────────

export function generateMonitorId(): string {
  return `mon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
export function generateScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Monitor CRUD ──────────────────────────────────────────────────────────────

export function createMonitor(m: ProactiveMonitor): ProactiveMonitor {
  monitors.set(m.id, m);
  return m;
}

export function updateMonitor(id: string, patch: Partial<ProactiveMonitor>): ProactiveMonitor | null {
  const existing = monitors.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  monitors.set(id, updated);
  return updated;
}

export function getMonitor(id: string): ProactiveMonitor | null {
  return monitors.get(id) ?? null;
}

export function listMonitors(opts: {
  tenantId?: string;
  status?: ProactiveMonitor['status'];
} = {}): ProactiveMonitor[] {
  let ms = Array.from(monitors.values());
  if (opts.tenantId) ms = ms.filter(m => m.tenantId === opts.tenantId);
  if (opts.status) ms = ms.filter(m => m.status === opts.status);
  return ms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteMonitor(id: string): boolean {
  return monitors.delete(id);
}

// ── Scan history ──────────────────────────────────────────────────────────────

export function recordScan(s: ProactiveScan): ProactiveScan {
  scans.set(s.id, s);
  return s;
}

export function listScans(opts: {
  tenantId?: string;
  monitorId?: string;
  limit?: number;
} = {}): ProactiveScan[] {
  let ss = Array.from(scans.values());
  if (opts.tenantId) ss = ss.filter(s => s.tenantId === opts.tenantId);
  if (opts.monitorId) ss = ss.filter(s => s.monitorId === opts.monitorId);
  ss.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  return opts.limit ? ss.slice(0, opts.limit) : ss;
}

// ── Threshold evaluation ──────────────────────────────────────────────────────
// Called by the /api/agents/proactive/scan route to evaluate all active monitors.

export interface ThresholdCheckResult {
  monitorId: string;
  shouldTrigger: boolean;
  currentValue?: number;
  reason: string;
}

export function evaluateThresholdMonitor(monitor: ProactiveMonitor, currentValue: number): ThresholdCheckResult {
  if (monitor.monitorType !== 'threshold' || monitor.threshold === undefined) {
    return { monitorId: monitor.id, shouldTrigger: false, reason: 'Not a threshold monitor' };
  }

  const comp = monitor.comparator ?? 'gt';
  let shouldTrigger = false;
  if (comp === 'gt')  shouldTrigger = currentValue > monitor.threshold;
  if (comp === 'gte') shouldTrigger = currentValue >= monitor.threshold;
  if (comp === 'lt')  shouldTrigger = currentValue < monitor.threshold;
  if (comp === 'lte') shouldTrigger = currentValue <= monitor.threshold;

  return {
    monitorId: monitor.id,
    shouldTrigger,
    currentValue,
    reason: shouldTrigger
      ? `${monitor.metricKey} = ${currentValue} ${comp} threshold ${monitor.threshold}`
      : `${monitor.metricKey} = ${currentValue} (below threshold ${monitor.threshold})`,
  };
}

// ── Seed data ─────────────────────────────────────────────────────────────────

let seeded = false;

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

export function seedProactiveMonitors(): void {
  if (seeded || monitors.size > 0) return;
  seeded = true;

  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  const seedMonitors: ProactiveMonitor[] = [
    // Threshold monitors
    {
      id: 'mon-001',
      name: 'Safety Signal PRR Alert',
      description: 'Triggers Signal Intelligence agent whenever a pharmacovigilance signal exceeds PRR threshold of 3.0',
      monitorType: 'threshold',
      metricKey: 'signal_prr',
      threshold: 3.0,
      comparator: 'gt',
      currentValue: 3.42,
      targetAgentId: 'signal-intelligence',
      targetEntityType: 'signal',
      targetEntityId: 'SIG-2026-001',
      status: 'triggered',
      lastTriggeredAt: ago(120),
      triggerCount: 3,
      tenantId: DEMO_TENANT,
      createdAt: ago(10080), // 7 days ago
    },
    {
      id: 'mon-002',
      name: 'HAQ Overdue Alert',
      description: 'Triggers HAQ Response agent when overdue HAQs exceed 2 (regulatory breach risk)',
      monitorType: 'threshold',
      metricKey: 'haq_overdue_count',
      threshold: 2,
      comparator: 'gt',
      currentValue: 3,
      targetAgentId: 'haq-response',
      targetEntityType: 'haq',
      targetEntityId: 'IR-2026-001',
      status: 'triggered',
      lastTriggeredAt: ago(240),
      triggerCount: 1,
      tenantId: DEMO_TENANT,
      createdAt: ago(7200),
    },
    {
      id: 'mon-003',
      name: 'Enrollment Velocity Drop',
      description: 'Triggers Study Operations agent when weekly enrollment velocity falls below 4 subjects/week',
      monitorType: 'threshold',
      metricKey: 'enrollment_velocity_weekly',
      threshold: 4,
      comparator: 'lt',
      currentValue: 6.2,
      targetAgentId: 'study-operations',
      targetEntityType: 'study',
      targetEntityId: 'LIG-2847-301',
      status: 'active',
      lastTriggeredAt: null,
      triggerCount: 0,
      tenantId: DEMO_TENANT,
      createdAt: ago(4320),
    },
    {
      id: 'mon-004',
      name: 'CAPA Effectiveness Overdue',
      description: 'Triggers Quality Intelligence agent when any CAPA effectiveness check is overdue by >7 days',
      monitorType: 'threshold',
      metricKey: 'capa_effectiveness_overdue_days',
      threshold: 7,
      comparator: 'gt',
      currentValue: 2,
      targetAgentId: 'quality-intelligence',
      targetEntityType: 'capa',
      targetEntityId: 'CAPA-2026-042',
      status: 'active',
      lastTriggeredAt: null,
      triggerCount: 0,
      tenantId: DEMO_TENANT,
      createdAt: ago(2880),
    },
    {
      id: 'mon-005',
      name: 'CMC Stability OOS Alert',
      description: 'Triggers CMC Lifecycle agent when any stability timepoint shows out-of-spec result',
      monitorType: 'threshold',
      metricKey: 'stability_oos_count',
      threshold: 0,
      comparator: 'gt',
      currentValue: 0,
      targetAgentId: 'cmc-lifecycle',
      targetEntityType: 'stability-study',
      targetEntityId: 'LIG-2847-STAB-01',
      status: 'active',
      lastTriggeredAt: null,
      triggerCount: 0,
      tenantId: DEMO_TENANT,
      createdAt: ago(1440),
    },
    // Scheduled monitors
    {
      id: 'mon-006',
      name: 'Weekly Portfolio Intelligence Scan',
      description: 'Runs Portfolio Intelligence agent every Monday 08:00 UTC to generate board-ready report',
      monitorType: 'scheduled',
      schedule: 'weekly',
      nextRunAt: new Date(now.getTime() + 4 * 24 * 3600_000).toISOString(),
      targetAgentId: 'portfolio-intelligence',
      targetEntityType: 'portfolio',
      targetEntityId: 'all',
      status: 'active',
      lastTriggeredAt: ago(10080),
      triggerCount: 12,
      tenantId: DEMO_TENANT,
      createdAt: ago(86400 * 7),
    },
    {
      id: 'mon-007',
      name: 'Daily Regulatory Commitment Check',
      description: 'Runs Regulatory Strategy agent daily to scan for commitment deadlines approaching within 14 days',
      monitorType: 'scheduled',
      schedule: 'daily',
      nextRunAt: new Date(now.getTime() + 18 * 3600_000).toISOString(),
      targetAgentId: 'reg-strategy',
      targetEntityType: 'product',
      targetEntityId: 'LIG-2847',
      status: 'active',
      lastTriggeredAt: ago(1440),
      triggerCount: 45,
      tenantId: DEMO_TENANT,
      createdAt: ago(86400 * 45),
    },
    {
      id: 'mon-008',
      name: 'Literature Intelligence Weekly Scan',
      description: 'Runs Research Intelligence agent every week to triage new literature for competitive threats',
      monitorType: 'scheduled',
      schedule: 'weekly',
      nextRunAt: new Date(now.getTime() + 2 * 24 * 3600_000).toISOString(),
      targetAgentId: 'research-intelligence',
      targetEntityType: 'product',
      targetEntityId: 'LIG-5104',
      status: 'active',
      lastTriggeredAt: ago(10080),
      triggerCount: 8,
      tenantId: DEMO_TENANT,
      createdAt: ago(86400 * 56),
    },
  ];

  const seedScans: ProactiveScan[] = [
    {
      id: 'scan-001',
      monitorId: 'mon-001',
      monitorName: 'Safety Signal PRR Alert',
      triggeredAt: ago(120),
      triggerReason: 'signal_prr = 3.42 > threshold 3.0',
      agentRunId: 'run-demo-004',
      agentId: 'signal-intelligence',
      outcome: 'agent-fired',
      tenantId: DEMO_TENANT,
    },
    {
      id: 'scan-002',
      monitorId: 'mon-002',
      monitorName: 'HAQ Overdue Alert',
      triggeredAt: ago(240),
      triggerReason: 'haq_overdue_count = 3 > threshold 2',
      agentRunId: 'run-demo-002',
      agentId: 'haq-response',
      outcome: 'agent-fired',
      tenantId: DEMO_TENANT,
    },
    {
      id: 'scan-003',
      monitorId: 'mon-006',
      monitorName: 'Weekly Portfolio Intelligence Scan',
      triggeredAt: ago(10080),
      triggerReason: 'Scheduled weekly run (Monday 08:00 UTC)',
      agentRunId: null,
      agentId: 'portfolio-intelligence',
      outcome: 'agent-fired',
      tenantId: DEMO_TENANT,
    },
    {
      id: 'scan-004',
      monitorId: 'mon-007',
      monitorName: 'Daily Regulatory Commitment Check',
      triggeredAt: ago(1440),
      triggerReason: 'Scheduled daily run',
      agentRunId: 'run-demo-006',
      agentId: 'reg-strategy',
      outcome: 'agent-fired',
      tenantId: DEMO_TENANT,
    },
  ];

  for (const m of seedMonitors) monitors.set(m.id, m);
  for (const s of seedScans) scans.set(s.id, s);
}
