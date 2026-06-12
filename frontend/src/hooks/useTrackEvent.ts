
// =============================================================================
// useTrackEvent — v0.83.0
// React hook for firing platform-wide usage events.
// =============================================================================

import { useCallback, useRef } from 'react';
import { usageEventService, UsageEventCategory } from '@/services/usage-event-service';
import { useSessionStore } from '@/store/useSessionStore';

export function useTrackEvent() {
  const currentUser = useSessionStore(s => s.currentUser);
  const userId = currentUser?.id ?? 'u-current';
  const userName = currentUser?.name ?? 'Current User';
  const userRole = currentUser?.role ?? 'regulatory-affairs';

  const enteredAt = useRef<number>(Date.now());

  const track = useCallback(
    (category: UsageEventCategory, featureId: string, label: string, moduleId: string, metadata?: Record<string, string | number | boolean>) => {
      usageEventService.track(category, featureId, label, moduleId, userId, userName, userRole, metadata);
    },
    [userId, userName, userRole],
  );

  const trackModule = useCallback(
    (moduleId: string) => {
      const durationMs = Date.now() - enteredAt.current;
      enteredAt.current = Date.now();
      usageEventService.trackModuleVisit(moduleId, userId, userName, userRole, durationMs);
    },
    [userId, userName, userRole],
  );

  const trackAction = useCallback(
    (featureId: string, label: string, moduleId: string, metadata?: Record<string, string | number | boolean>) => {
      usageEventService.trackFeatureAction(featureId, label, moduleId, userId, userName, userRole, metadata);
    },
    [userId, userName, userRole],
  );

  const trackAI = useCallback(
    (featureId: string, label: string, moduleId: string) => {
      usageEventService.trackAIInvocation(featureId, label, moduleId, userId, userName, userRole);
    },
    [userId, userName, userRole],
  );

  return { track, trackModule, trackAction, trackAI };
}
