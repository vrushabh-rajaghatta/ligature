
// =============================================================================
// USAGE EVENT SERVICE - v0.83.0
// Platform-wide behavioral analytics event bus.
// Generalises the templateUsageTrackingService pattern to cover all modules
// and user actions across the platform.
//
// Event categories:
//   module_visit     — user navigates to a module
//   feature_action   — user triggers a significant action (create, submit, etc.)
//   ai_invocation    — user triggers any AI feature
//   search           — user performs a search
//   export           — user downloads / exports data
//   error_encountered — user hits an error state
//
// Storage: localStorage, capped at 5 000 events (FIFO).
// =============================================================================

export type UsageEventCategory =
  | 'module_visit'
  | 'feature_action'
  | 'ai_invocation'
  | 'search'
  | 'export'
  | 'error_encountered';

export interface UsageEvent {
  id: string;
  category: UsageEventCategory;
  /** Dot-separated identifier: "module.action"  e.g. "authoring.create_document" */
  featureId: string;
  /** Human-readable label for display */
  label: string;
  moduleId: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  /** Time spent on the previous screen before this event, ms */
  durationMs?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ModuleUsageStat {
  moduleId: string;
  moduleName: string;
  visits: number;
  uniqueUsers: number;
  avgDurationMs: number;
  lastVisit: string;
  trend: number[]; // 7-day visit counts newest-last
}

export interface FeatureUsageStat {
  featureId: string;
  label: string;
  moduleId: string;
  count: number;
  uniqueUsers: number;
  lastUsed: string;
}

export interface UserJourneyStat {
  fromModuleId: string;
  toModuleId: string;
  count: number;
}

export interface UsageSummary {
  totalEvents: number;
  totalSessions: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  avgSessionDurationMs: number;
  topModules: ModuleUsageStat[];
  topFeatures: FeatureUsageStat[];
  journeys: UserJourneyStat[];
  recentEvents: UsageEvent[];
  dailyEventCounts: { date: string; count: number }[];
}

// =============================================================================
// MODULE DISPLAY NAMES
// =============================================================================

const MODULE_NAMES: Record<string, string> = {
  home: 'Home',
  portfolio: 'Portfolio',
  'portfolio-strategy': 'Portfolio Strategy',
  authoring: 'Authoring',
  haq: 'HAQ',
  safety: 'Safety & PV',
  ctms: 'Clinical Trials',
  qms: 'QMS',
  tmf: 'TMF',
  'submissions-hub': 'Submissions Hub',
  'document-control': 'Document Control',
  publishing: 'Publishing',
  'master-data': 'Master Data',
  idmp: 'IDMP',
  analytics: 'Analytics',
  labeling: 'Labeling',
  'reg-intel': 'Reg Intelligence',
  'reg-calendar': 'Reg Calendar',
  'signal-detection': 'Signal Detection',
  'continuous-submission': 'Continuous Submission',
  'ai-consistency': 'AI Consistency',
  'ai-generation': 'AI Generation',
  biostats: 'Biostatistics',
  cmc: 'CMC',
  manufacturing: 'Manufacturing',
  gcp: 'GCP Compliance',
  gmp: 'GMP Compliance',
  glp: 'GLP Compliance',
  adpromo: 'Ad & Promo',
  psmf: 'PSMF',
  eln: 'ELN',
  research: 'Research',
  commitments: 'Commitments',
  registrations: 'Registrations',
  'submission-command': 'Submission Command',
  'study-intel': 'Study Intel',
  'action-center': 'Action Center',
};

// =============================================================================
// SEED DATA — realistic mock history so dashboard is useful on first load
// =============================================================================

const DEMO_USERS = [
  { id: 'u-1', name: 'Sarah Chen', role: 'regulatory-affairs' },
  { id: 'u-2', name: 'Marcus Webb', role: 'clinical-operations' },
  { id: 'u-3', name: 'Priya Nair', role: 'safety-pv' },
  { id: 'u-4', name: 'Tom Richter', role: 'cmc-lead' },
  { id: 'u-5', name: 'Elena Vasquez', role: 'medical-affairs' },
  { id: 'u-6', name: 'James Okafor', role: 'regulatory-affairs' },
];

const SEED_EVENTS: Array<Omit<UsageEvent, 'id'>> = (() => {
  const events: Array<Omit<UsageEvent, 'id'>> = [];
  const now = Date.now();
  const DAY = 86_400_000;

  // weighted module visit distribution — realistic heavy hitters
  const moduleWeights: [string, number][] = [
    ['authoring', 18],
    ['submissions-hub', 14],
    ['haq', 12],
    ['safety', 10],
    ['ctms', 9],
    ['qms', 7],
    ['home', 6],
    ['portfolio', 6],
    ['tmf', 5],
    ['document-control', 4],
    ['labeling', 3],
    ['idmp', 3],
    ['master-data', 2],
    ['analytics', 1],
    ['reg-intel', 1],
    ['continuous-submission', 1],
    ['publishing', 1],
  ];

  const weightedModules: string[] = [];
  moduleWeights.forEach(([id, w]) => {
    for (let i = 0; i < w; i++) weightedModules.push(id);
  });

  const featuresByModule: Record<string, [string, string][]> = {
    authoring: [
      ['authoring.create_document', 'Create Document'],
      ['authoring.ai_draft', 'AI Draft Section'],
      ['authoring.finalize', 'Finalize Document'],
      ['authoring.send_to_ectd', 'Send to eCTD'],
    ],
    'submissions-hub': [
      ['submissions.new_sequence', 'New Sequence'],
      ['submissions.view_status', 'View Status'],
      ['submissions.export_package', 'Export Package'],
    ],
    haq: [
      ['haq.package_responses', 'Package Responses'],
      ['haq.ai_draft_response', 'AI Draft Response'],
      ['haq.mark_complete', 'Mark Complete'],
    ],
    safety: [
      ['safety.new_case', 'New Safety Case'],
      ['safety.submit_e2b', 'Submit E2B'],
      ['safety.signal_review', 'Review Signal'],
    ],
    ctms: [
      ['ctms.view_study', 'View Study'],
      ['ctms.enroll_subject', 'Enroll Subject'],
      ['ctms.log_deviation', 'Log Deviation'],
    ],
    qms: [
      ['qms.new_deviation', 'New Deviation'],
      ['qms.new_capa', 'New CAPA'],
      ['qms.submit_review', 'Submit for Review'],
    ],
  };

  // Generate 30 days of history
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const dayTs = now - dayOffset * DAY;
    // 5-14 events per day depending on weekday
    const date = new Date(dayTs);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const eventsPerDay = isWeekend ? 5 : Math.floor(Math.random() * 9) + 6;

    for (let i = 0; i < eventsPerDay; i++) {
      const user = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
      const moduleId = weightedModules[Math.floor(Math.random() * weightedModules.length)];
      const moduleFeatures = featuresByModule[moduleId];

      // Always add a module visit
      events.push({
        category: 'module_visit',
        featureId: `${moduleId}.visit`,
        label: MODULE_NAMES[moduleId] || moduleId,
        moduleId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        timestamp: new Date(dayTs + Math.random() * DAY).toISOString(),
        durationMs: Math.floor(Math.random() * 600_000) + 30_000,
      });

      // Sometimes add a feature action
      if (moduleFeatures && Math.random() > 0.45) {
        const [featureId, label] = moduleFeatures[Math.floor(Math.random() * moduleFeatures.length)];
        const isAI = featureId.includes('ai_');
        events.push({
          category: isAI ? 'ai_invocation' : 'feature_action',
          featureId,
          label,
          moduleId,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          timestamp: new Date(dayTs + Math.random() * DAY).toISOString(),
        });
      }
    }
  }

  return events;
})();

// =============================================================================
// SERVICE CLASS
// =============================================================================

class UsageEventService {
  private static instance: UsageEventService;
  private events: UsageEvent[] = [];
  private listeners: Set<(event: UsageEvent) => void> = new Set();
  private readonly MAX_EVENTS = 5_000;
  private readonly STORAGE_KEY = 'ligature:usage-events-v1';

  private constructor() {
    this.seedAndLoad();
  }

  static getInstance(): UsageEventService {
    if (!UsageEventService.instance) {
      UsageEventService.instance = new UsageEventService();
    }
    return UsageEventService.instance;
  }

  // ---------------------------------------------------------------------------
  // STORAGE
  // ---------------------------------------------------------------------------

  private seedAndLoad(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.events = JSON.parse(stored);
      } else {
        // First load — seed with realistic history
        this.events = SEED_EVENTS.map((e, i) => ({
          ...e,
          id: `use-seed-${i}`,
        }));
        this.persist();
      }
    } catch {
      this.events = SEED_EVENTS.map((e, i) => ({ ...e, id: `use-seed-${i}` }));
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      const toStore = this.events.slice(-this.MAX_EVENTS);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // quota exceeded — trim aggressively
      this.events = this.events.slice(-500);
    }
  }

  // ---------------------------------------------------------------------------
  // TRACKING
  // ---------------------------------------------------------------------------

  track(
    category: UsageEventCategory,
    featureId: string,
    label: string,
    moduleId: string,
    userId = 'u-current',
    userName = 'Current User',
    userRole = 'regulatory-affairs',
    metadata?: Record<string, string | number | boolean>,
    durationMs?: number,
  ): UsageEvent {
    const event: UsageEvent = {
      id: `use-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      category,
      featureId,
      label,
      moduleId,
      userId,
      userName,
      userRole,
      timestamp: new Date().toISOString(),
      durationMs,
      metadata,
    };
    this.events.push(event);
    this.persist();
    this.listeners.forEach(l => l(event));
    return event;
  }

  trackModuleVisit(moduleId: string, userId?: string, userName?: string, userRole?: string, durationMs?: number) {
    return this.track(
      'module_visit',
      `${moduleId}.visit`,
      MODULE_NAMES[moduleId] || moduleId,
      moduleId, userId, userName, userRole, undefined, durationMs,
    );
  }

  trackFeatureAction(featureId: string, label: string, moduleId: string, userId?: string, userName?: string, userRole?: string, metadata?: Record<string, string | number | boolean>) {
    return this.track('feature_action', featureId, label, moduleId, userId, userName, userRole, metadata);
  }

  trackAIInvocation(featureId: string, label: string, moduleId: string, userId?: string, userName?: string, userRole?: string) {
    return this.track('ai_invocation', featureId, label, moduleId, userId, userName, userRole);
  }

  // ---------------------------------------------------------------------------
  // QUERIES
  // ---------------------------------------------------------------------------

  getEvents(filters?: {
    category?: UsageEventCategory;
    moduleId?: string;
    userId?: string;
    featureId?: string;
    since?: string; // ISO date
    limit?: number;
  }): UsageEvent[] {
    let result = [...this.events];
    if (filters?.category) result = result.filter(e => e.category === filters.category);
    if (filters?.moduleId) result = result.filter(e => e.moduleId === filters.moduleId);
    if (filters?.userId) result = result.filter(e => e.userId === filters.userId);
    if (filters?.featureId) result = result.filter(e => e.featureId === filters.featureId);
    if (filters?.since) result = result.filter(e => e.timestamp >= filters.since!);
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (filters?.limit) result = result.slice(0, filters.limit);
    return result;
  }

  getSummary(days = 30): UsageSummary {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const window7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const window1 = new Date(Date.now() - 86_400_000).toISOString();

    const windowed = this.events.filter(e => e.timestamp >= since);

    // DAU / WAU
    const dau = new Set(this.events.filter(e => e.timestamp >= window1).map(e => e.userId)).size;
    const wau = new Set(this.events.filter(e => e.timestamp >= window7).map(e => e.userId)).size;

    // Sessions: a "session" = group of events from same user within 30-min gaps
    const sessionCount = this.countSessions(windowed);

    // Avg session duration
    const durations = windowed.filter(e => e.durationMs).map(e => e.durationMs!);
    const avgSessionDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Top modules
    const moduleMap = new Map<string, { visits: number; users: Set<string>; durations: number[]; lastVisit: string }>();
    windowed.filter(e => e.category === 'module_visit').forEach(e => {
      const entry = moduleMap.get(e.moduleId) ?? { visits: 0, users: new Set(), durations: [], lastVisit: '' };
      entry.visits++;
      entry.users.add(e.userId);
      if (e.durationMs) entry.durations.push(e.durationMs);
      if (e.timestamp > entry.lastVisit) entry.lastVisit = e.timestamp;
      moduleMap.set(e.moduleId, entry);
    });

    const topModules: ModuleUsageStat[] = Array.from(moduleMap.entries())
      .map(([moduleId, d]) => ({
        moduleId,
        moduleName: MODULE_NAMES[moduleId] || moduleId,
        visits: d.visits,
        uniqueUsers: d.users.size,
        avgDurationMs: d.durations.length ? d.durations.reduce((a, b) => a + b, 0) / d.durations.length : 0,
        lastVisit: d.lastVisit,
        trend: this.buildTrend(moduleId, 7),
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 12);

    // Top features
    const featureMap = new Map<string, { label: string; moduleId: string; count: number; users: Set<string>; lastUsed: string }>();
    windowed.filter(e => e.category !== 'module_visit').forEach(e => {
      const entry = featureMap.get(e.featureId) ?? { label: e.label, moduleId: e.moduleId, count: 0, users: new Set(), lastUsed: '' };
      entry.count++;
      entry.users.add(e.userId);
      if (e.timestamp > entry.lastUsed) entry.lastUsed = e.timestamp;
      featureMap.set(e.featureId, entry);
    });

    const topFeatures: FeatureUsageStat[] = Array.from(featureMap.entries())
      .map(([featureId, d]) => ({
        featureId,
        label: d.label,
        moduleId: d.moduleId,
        count: d.count,
        uniqueUsers: d.users.size,
        lastUsed: d.lastUsed,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // User journey transitions
    const journeyMap = new Map<string, number>();
    const userVisits = new Map<string, string[]>();
    windowed
      .filter(e => e.category === 'module_visit')
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .forEach(e => {
        const prev = userVisits.get(e.userId);
        if (prev && prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last !== e.moduleId) {
            const key = `${last}→${e.moduleId}`;
            journeyMap.set(key, (journeyMap.get(key) ?? 0) + 1);
          }
        }
        userVisits.set(e.userId, [...(userVisits.get(e.userId) ?? []), e.moduleId]);
      });

    const journeys: UserJourneyStat[] = Array.from(journeyMap.entries())
      .map(([key, count]) => {
        const [fromModuleId, toModuleId] = key.split('→');
        return { fromModuleId, toModuleId, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Daily event counts
    const dailyMap = new Map<string, number>();
    windowed.forEach(e => {
      const date = e.timestamp.slice(0, 10);
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
    });
    const dailyEventCounts = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEvents: windowed.length,
      totalSessions: sessionCount,
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      avgSessionDurationMs,
      topModules,
      topFeatures,
      journeys,
      recentEvents: this.getEvents({ limit: 30 }),
      dailyEventCounts,
    };
  }

  private buildTrend(moduleId: string, days: number): number[] {
    const counts: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(Date.now() - (i + 1) * 86_400_000).toISOString().slice(0, 10);
      const end = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      counts.push(
        this.events.filter(
          e => e.moduleId === moduleId && e.category === 'module_visit' && e.timestamp.slice(0, 10) >= start && e.timestamp.slice(0, 10) < end
        ).length
      );
    }
    return counts;
  }

  private countSessions(events: UsageEvent[]): number {
    const GAP = 30 * 60 * 1000; // 30 min
    const byUser = new Map<string, string[]>();
    events.forEach(e => {
      const ts = byUser.get(e.userId) ?? [];
      ts.push(e.timestamp);
      byUser.set(e.userId, ts);
    });
    let sessions = 0;
    byUser.forEach(timestamps => {
      const sorted = timestamps.sort();
      sessions++; // first event = first session
      for (let i = 1; i < sorted.length; i++) {
        if (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime() > GAP) {
          sessions++;
        }
      }
    });
    return sessions;
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS & ADMIN
  // ---------------------------------------------------------------------------

  subscribe(listener: (event: UsageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clearEvents(): void {
    this.events = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  exportCSV(): string {
    const header = 'id,category,featureId,label,moduleId,userId,userName,userRole,timestamp,durationMs';
    const rows = this.events.map(e =>
      [e.id, e.category, e.featureId, e.label, e.moduleId, e.userId, e.userName, e.userRole, e.timestamp, e.durationMs ?? ''].join(',')
    );
    return [header, ...rows].join('\n');
  }
}

export const usageEventService = UsageEventService.getInstance();
