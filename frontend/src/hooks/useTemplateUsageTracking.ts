
// =============================================================================
// USE TEMPLATE USAGE TRACKING HOOK - v0.42.11
// React hook for template usage tracking integration
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  templateUsageTrackingService,
  TemplateUsageEvent,
  TemplateUsageStats,
  TemplateUsageSummary,
} from '@/services/template-usage-tracking-service';
import { DocumentTemplate } from '@/data/ectd-document-templates';

export interface UseTemplateUsageTrackingReturn {
  // Summary
  summary: TemplateUsageSummary | null;
  
  // Stats for specific template
  getStatsForTemplate: (templateId: string) => TemplateUsageStats;
  
  // Recent events
  recentEvents: TemplateUsageEvent[];
  
  // Tracking methods
  trackViewed: (template: DocumentTemplate) => void;
  trackPreviewed: (template: DocumentTemplate) => void;
  trackSelected: (template: DocumentTemplate) => void;
  trackCreated: (template: DocumentTemplate, context?: TemplateUsageEvent['context']) => void;
  trackCompleted: (template: DocumentTemplate, context?: TemplateUsageEvent['context'], metadata?: TemplateUsageEvent['metadata']) => void;
  trackAbandoned: (template: DocumentTemplate, context?: TemplateUsageEvent['context'], metadata?: TemplateUsageEvent['metadata']) => void;
  
  // Query
  getEvents: (filters?: {
    templateId?: string;
    eventType?: TemplateUsageEvent['eventType'];
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => TemplateUsageEvent[];
  
  // Refresh
  refresh: () => void;
  
  // Loading state
  isLoading: boolean;
}

export function useTemplateUsageTracking(): UseTemplateUsageTrackingReturn {
  const [summary, setSummary] = useState<TemplateUsageSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<TemplateUsageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadData = useCallback(() => {
    setIsLoading(true);
    try {
      setSummary(templateUsageTrackingService.getSummary());
      setRecentEvents(templateUsageTrackingService.getEvents({ limit: 20 }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to new events
    const unsubscribe = templateUsageTrackingService.subscribe(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const trackViewed = useCallback((template: DocumentTemplate) => {
    templateUsageTrackingService.trackViewed(template);
  }, []);

  const trackPreviewed = useCallback((template: DocumentTemplate) => {
    templateUsageTrackingService.trackPreviewed(template);
  }, []);

  const trackSelected = useCallback((template: DocumentTemplate) => {
    templateUsageTrackingService.trackSelected(template);
  }, []);

  const trackCreated = useCallback((
    template: DocumentTemplate,
    context?: TemplateUsageEvent['context']
  ) => {
    templateUsageTrackingService.trackCreated(template, context || {});
  }, []);

  const trackCompleted = useCallback((
    template: DocumentTemplate,
    context?: TemplateUsageEvent['context'],
    metadata?: TemplateUsageEvent['metadata']
  ) => {
    templateUsageTrackingService.trackCompleted(template, context || {}, metadata || {});
  }, []);

  const trackAbandoned = useCallback((
    template: DocumentTemplate,
    context?: TemplateUsageEvent['context'],
    metadata?: TemplateUsageEvent['metadata']
  ) => {
    templateUsageTrackingService.trackAbandoned(template, context || {}, metadata || {});
  }, []);

  const getStatsForTemplate = useCallback((templateId: string): TemplateUsageStats => {
    return templateUsageTrackingService.getStatsForTemplate(templateId);
  }, []);

  const getEvents = useCallback((filters?: {
    templateId?: string;
    eventType?: TemplateUsageEvent['eventType'];
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): TemplateUsageEvent[] => {
    return templateUsageTrackingService.getEvents(filters);
  }, []);

  return {
    summary,
    getStatsForTemplate,
    recentEvents,
    trackViewed,
    trackPreviewed,
    trackSelected,
    trackCreated,
    trackCompleted,
    trackAbandoned,
    getEvents,
    refresh: loadData,
    isLoading,
  };
}

export default useTemplateUsageTracking;
