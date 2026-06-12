
// =============================================================================
// TEMPLATE USAGE TRACKING SERVICE - v0.42.11
// Tracks template selection, creation, and completion metrics
// Integrates with analytics and cross-module events
// =============================================================================

import { DocumentTemplate } from '@/data/ectd-document-templates';

// =============================================================================
// TYPES
// =============================================================================

export interface TemplateUsageEvent {
  id: string;
  templateId: string;
  templateName: string;
  eventType: 'viewed' | 'previewed' | 'selected' | 'created' | 'completed' | 'abandoned';
  userId: string;
  userName: string;
  timestamp: string;
  context?: {
    programId?: string;
    studyId?: string;
    submissionId?: string;
    sourceModule?: string;
  };
  metadata?: {
    timeSpentMs?: number;
    completionRate?: number;
    sectionsCompleted?: number;
    sectionsTotal?: number;
  };
}

export interface TemplateUsageStats {
  templateId: string;
  templateName: string;
  totalViews: number;
  totalPreviews: number;
  totalSelections: number;
  totalCreations: number;
  totalCompletions: number;
  totalAbandoned: number;
  conversionRate: number;  // selections → creations
  completionRate: number;  // creations → completions
  avgTimeToComplete: number;  // in hours
  lastUsed: string | null;
  byMonth: { month: string; count: number }[];
  byUser: { userId: string; userName: string; count: number }[];
  byProgram: { programId: string; programName: string; count: number }[];
}

export interface TemplateUsageSummary {
  totalEvents: number;
  uniqueTemplatesUsed: number;
  totalDocumentsCreated: number;
  totalDocumentsCompleted: number;
  overallCompletionRate: number;
  mostPopularTemplates: { templateId: string; templateName: string; count: number }[];
  recentActivity: TemplateUsageEvent[];
  trendsThisMonth: {
    viewsChange: number;
    creationsChange: number;
    completionRateChange: number;
  };
}

// =============================================================================
// SINGLETON SERVICE
// =============================================================================

class TemplateUsageTrackingService {
  private static instance: TemplateUsageTrackingService;
  private events: TemplateUsageEvent[] = [];
  private listeners: Set<(event: TemplateUsageEvent) => void> = new Set();

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): TemplateUsageTrackingService {
    if (!TemplateUsageTrackingService.instance) {
      TemplateUsageTrackingService.instance = new TemplateUsageTrackingService();
    }
    return TemplateUsageTrackingService.instance;
  }

  // =============================================================================
  // STORAGE
  // =============================================================================

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('ligature:template-usage-events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load template usage events:', e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      // Keep last 1000 events to prevent unbounded growth
      const eventsToStore = this.events.slice(-1000);
      localStorage.setItem('ligature:template-usage-events', JSON.stringify(eventsToStore));
    } catch (e) {
      console.warn('Failed to save template usage events:', e);
    }
  }

  // =============================================================================
  // EVENT TRACKING
  // =============================================================================

  trackEvent(
    template: DocumentTemplate,
    eventType: TemplateUsageEvent['eventType'],
    userId: string = 'u-current',
    userName: string = 'Current User',
    context?: TemplateUsageEvent['context'],
    metadata?: TemplateUsageEvent['metadata']
  ): TemplateUsageEvent {
    const event: TemplateUsageEvent = {
      id: `tue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId: template.id,
      templateName: template.name,
      eventType,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      context,
      metadata,
    };

    this.events.push(event);
    this.saveToStorage();

    // Notify listeners
    this.listeners.forEach(listener => listener(event));

    return event;
  }

  trackViewed(template: DocumentTemplate, userId?: string, userName?: string): TemplateUsageEvent {
    return this.trackEvent(template, 'viewed', userId, userName);
  }

  trackPreviewed(template: DocumentTemplate, userId?: string, userName?: string): TemplateUsageEvent {
    return this.trackEvent(template, 'previewed', userId, userName);
  }

  trackSelected(template: DocumentTemplate, userId?: string, userName?: string): TemplateUsageEvent {
    return this.trackEvent(template, 'selected', userId, userName);
  }

  trackCreated(
    template: DocumentTemplate,
    context: TemplateUsageEvent['context'],
    userId?: string,
    userName?: string
  ): TemplateUsageEvent {
    return this.trackEvent(template, 'created', userId, userName, context);
  }

  trackCompleted(
    template: DocumentTemplate,
    context: TemplateUsageEvent['context'],
    metadata: TemplateUsageEvent['metadata'],
    userId?: string,
    userName?: string
  ): TemplateUsageEvent {
    return this.trackEvent(template, 'completed', userId, userName, context, metadata);
  }

  trackAbandoned(
    template: DocumentTemplate,
    context: TemplateUsageEvent['context'],
    metadata: TemplateUsageEvent['metadata'],
    userId?: string,
    userName?: string
  ): TemplateUsageEvent {
    return this.trackEvent(template, 'abandoned', userId, userName, context, metadata);
  }

  // =============================================================================
  // QUERIES
  // =============================================================================

  getEvents(filters?: {
    templateId?: string;
    eventType?: TemplateUsageEvent['eventType'];
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): TemplateUsageEvent[] {
    let filtered = [...this.events];

    if (filters?.templateId) {
      filtered = filtered.filter(e => e.templateId === filters.templateId);
    }
    if (filters?.eventType) {
      filtered = filtered.filter(e => e.eventType === filters.eventType);
    }
    if (filters?.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  getStatsForTemplate(templateId: string): TemplateUsageStats {
    const templateEvents = this.events.filter(e => e.templateId === templateId);
    
    if (templateEvents.length === 0) {
      return {
        templateId,
        templateName: '',
        totalViews: 0,
        totalPreviews: 0,
        totalSelections: 0,
        totalCreations: 0,
        totalCompletions: 0,
        totalAbandoned: 0,
        conversionRate: 0,
        completionRate: 0,
        avgTimeToComplete: 0,
        lastUsed: null,
        byMonth: [],
        byUser: [],
        byProgram: [],
      };
    }

    const views = templateEvents.filter(e => e.eventType === 'viewed').length;
    const previews = templateEvents.filter(e => e.eventType === 'previewed').length;
    const selections = templateEvents.filter(e => e.eventType === 'selected').length;
    const creations = templateEvents.filter(e => e.eventType === 'created').length;
    const completions = templateEvents.filter(e => e.eventType === 'completed').length;
    const abandoned = templateEvents.filter(e => e.eventType === 'abandoned').length;

    // Calculate time to complete
    const completionTimes = templateEvents
      .filter(e => e.eventType === 'completed' && e.metadata?.timeSpentMs)
      .map(e => e.metadata!.timeSpentMs!);
    const avgTimeToComplete = completionTimes.length > 0
      ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length / 3600000 // Convert to hours
      : 0;

    // Group by month
    const monthMap = new Map<string, number>();
    templateEvents.forEach(e => {
      const month = e.timestamp.substring(0, 7); // YYYY-MM
      monthMap.set(month, (monthMap.get(month) || 0) + 1);
    });

    // Group by user
    const userMap = new Map<string, { userName: string; count: number }>();
    templateEvents.forEach(e => {
      const existing = userMap.get(e.userId);
      if (existing) {
        existing.count++;
      } else {
        userMap.set(e.userId, { userName: e.userName, count: 1 });
      }
    });

    // Group by program
    const programMap = new Map<string, { programName: string; count: number }>();
    templateEvents.forEach(e => {
      if (e.context?.programId) {
        const existing = programMap.get(e.context.programId);
        if (existing) {
          existing.count++;
        } else {
          programMap.set(e.context.programId, { programName: e.context.programId, count: 1 });
        }
      }
    });

    return {
      templateId,
      templateName: templateEvents[0].templateName,
      totalViews: views,
      totalPreviews: previews,
      totalSelections: selections,
      totalCreations: creations,
      totalCompletions: completions,
      totalAbandoned: abandoned,
      conversionRate: selections > 0 ? (creations / selections) * 100 : 0,
      completionRate: creations > 0 ? (completions / creations) * 100 : 0,
      avgTimeToComplete,
      lastUsed: templateEvents[templateEvents.length - 1]?.timestamp || null,
      byMonth: Array.from(monthMap.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      byUser: Array.from(userMap.entries())
        .map(([userId, data]) => ({ userId, userName: data.userName, count: data.count }))
        .sort((a, b) => b.count - a.count),
      byProgram: Array.from(programMap.entries())
        .map(([programId, data]) => ({ programId, programName: data.programName, count: data.count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  getSummary(): TemplateUsageSummary {
    const now = new Date();
    const thisMonth = now.toISOString().substring(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 7);

    // Count unique templates
    const uniqueTemplates = new Set(this.events.map(e => e.templateId));

    // Count creations and completions
    const creations = this.events.filter(e => e.eventType === 'created');
    const completions = this.events.filter(e => e.eventType === 'completed');

    // Most popular templates
    const templateCounts = new Map<string, { name: string; count: number }>();
    this.events.forEach(e => {
      const existing = templateCounts.get(e.templateId);
      if (existing) {
        existing.count++;
      } else {
        templateCounts.set(e.templateId, { name: e.templateName, count: 1 });
      }
    });

    const mostPopular = Array.from(templateCounts.entries())
      .map(([templateId, data]) => ({ templateId, templateName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Monthly trends
    const thisMonthEvents = this.events.filter(e => e.timestamp.startsWith(thisMonth));
    const lastMonthEvents = this.events.filter(e => e.timestamp.startsWith(lastMonth));

    const thisMonthViews = thisMonthEvents.filter(e => e.eventType === 'viewed').length;
    const lastMonthViews = lastMonthEvents.filter(e => e.eventType === 'viewed').length;
    
    const thisMonthCreations = thisMonthEvents.filter(e => e.eventType === 'created').length;
    const lastMonthCreations = lastMonthEvents.filter(e => e.eventType === 'created').length;

    const thisMonthCompletions = thisMonthEvents.filter(e => e.eventType === 'completed').length;
    const lastMonthCompletions = lastMonthEvents.filter(e => e.eventType === 'completed').length;

    const thisMonthCompletionRate = thisMonthCreations > 0 ? (thisMonthCompletions / thisMonthCreations) * 100 : 0;
    const lastMonthCompletionRate = lastMonthCreations > 0 ? (lastMonthCompletions / lastMonthCreations) * 100 : 0;

    return {
      totalEvents: this.events.length,
      uniqueTemplatesUsed: uniqueTemplates.size,
      totalDocumentsCreated: creations.length,
      totalDocumentsCompleted: completions.length,
      overallCompletionRate: creations.length > 0 ? (completions.length / creations.length) * 100 : 0,
      mostPopularTemplates: mostPopular,
      recentActivity: this.getEvents({ limit: 20 }),
      trendsThisMonth: {
        viewsChange: lastMonthViews > 0 ? ((thisMonthViews - lastMonthViews) / lastMonthViews) * 100 : 0,
        creationsChange: lastMonthCreations > 0 ? ((thisMonthCreations - lastMonthCreations) / lastMonthCreations) * 100 : 0,
        completionRateChange: thisMonthCompletionRate - lastMonthCompletionRate,
      },
    };
  }

  // =============================================================================
  // SUBSCRIPTIONS
  // =============================================================================

  subscribe(listener: (event: TemplateUsageEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // =============================================================================
  // ADMIN
  // =============================================================================

  clearEvents(): void {
    this.events = [];
    this.saveToStorage();
  }

  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  importEvents(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.events = [...this.events, ...imported];
        this.saveToStorage();
      }
    } catch (e) {
      console.error('Failed to import events:', e);
    }
  }
}

// Export singleton instance
export const templateUsageTrackingService = TemplateUsageTrackingService.getInstance();
