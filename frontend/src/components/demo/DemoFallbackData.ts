// ============================================================================
// DEMO FALLBACK DATA - v0.15.34
// Provides fallback content when demo data is missing or unavailable
// Ensures demos never crash due to missing data
// ============================================================================

import { ScenarioId, ScenarioStep } from '@/store/useGuidedScenarioStore';
import { ModuleId, CrossModuleEventType } from '@/store/useCrossModuleEventStore';

// ============================================================================
// FALLBACK CONTENT TYPES
// ============================================================================

export interface FallbackContent {
  title: string;
  description: string;
  placeholderData: Record<string, unknown>;
  recoveryMessage: string;
}

export interface StepFallback {
  stepId: string;
  fallbackContent: FallbackContent;
  skipAllowed: boolean;
  retryAllowed: boolean;
}

// ============================================================================
// MODULE FALLBACK DATA
// Default data to show when module data is unavailable
// ============================================================================

export const MODULE_FALLBACK_DATA: Record<string, FallbackContent> = {
  research: {
    title: 'Research Module',
    description: 'Preclinical and research data management',
    placeholderData: {
      studies: [
        { id: 'demo-study-1', name: 'Demo GLP Study', status: 'Active' },
        { id: 'demo-study-2', name: 'Demo PK Study', status: 'Complete' },
      ],
    },
    recoveryMessage: 'Using demonstration data for Research module',
  },
  safety: {
    title: 'Safety & Pharmacovigilance',
    description: 'Safety surveillance and case management',
    placeholderData: {
      cases: [
        { id: 'demo-case-1', type: 'ICSR', status: 'Open' },
        { id: 'demo-case-2', type: 'Signal', status: 'Under Review' },
      ],
      signals: [
        { id: 'demo-signal-1', name: 'Hepatotoxicity', prr: 3.19, status: 'Confirmed' },
      ],
    },
    recoveryMessage: 'Using demonstration data for Safety module',
  },
  labeling: {
    title: 'Labeling Management',
    description: 'Product labeling and revisions',
    placeholderData: {
      labels: [
        { id: 'demo-label-1', product: 'LIG-2847', version: '2.1', region: 'US' },
      ],
      revisions: [
        { id: 'demo-rev-1', type: 'Safety Update', status: 'Draft' },
      ],
    },
    recoveryMessage: 'Using demonstration data for Labeling module',
  },
  submissions: {
    title: 'Regulatory Submissions',
    description: 'eCTD workspace and submission management',
    placeholderData: {
      sequences: [
        { id: 'demo-seq-1', number: '0000', type: 'Original', status: 'Submitted' },
        { id: 'demo-seq-2', number: '0001', type: 'Amendment', status: 'Building' },
      ],
    },
    recoveryMessage: 'Using demonstration data for Submissions module',
  },
  authoring: {
    title: 'Document Authoring',
    description: 'Regulatory document creation and management',
    placeholderData: {
      documents: [
        { id: 'demo-doc-1', title: 'Clinical Study Report', status: 'In Review' },
        { id: 'demo-doc-2', title: 'Investigator Brochure', status: 'Draft' },
      ],
    },
    recoveryMessage: 'Using demonstration data for Authoring module',
  },
  haq: {
    title: 'HAQ Intelligence',
    description: 'Health Authority Question management',
    placeholderData: {
      questions: [
        { id: 'demo-haq-1', source: 'FDA', type: 'Day 74', status: 'Pending' },
        { id: 'demo-haq-2', source: 'EMA', type: 'RSI', status: 'Responded' },
      ],
    },
    recoveryMessage: 'Using demonstration data for HAQ module',
  },
  regulatory: {
    title: 'Regulatory Strategy',
    description: 'Strategic regulatory planning',
    placeholderData: {
      strategies: [
        { id: 'demo-strat-1', product: 'LIG-2847', pathway: 'Standard NDA' },
      ],
    },
    recoveryMessage: 'Using demonstration data for Regulatory module',
  },
};

// ============================================================================
// STEP-SPECIFIC FALLBACKS
// How to handle each type of step when it fails
// ============================================================================

export function getStepFallback(step: ScenarioStep): StepFallback {
  const baseFallback: FallbackContent = {
    title: step.title,
    description: step.description,
    placeholderData: {},
    recoveryMessage: 'Step skipped - continuing demo',
  };

  switch (step.action) {
    case 'navigate':
      return {
        stepId: step.id,
        fallbackContent: {
          ...baseFallback,
          recoveryMessage: `Navigation to ${step.module} - using placeholder view`,
          placeholderData: MODULE_FALLBACK_DATA[step.module]?.placeholderData || {},
        },
        skipAllowed: true,
        retryAllowed: true,
      };

    case 'highlight':
      return {
        stepId: step.id,
        fallbackContent: {
          ...baseFallback,
          recoveryMessage: step.highlightText 
            ? `Highlight: "${step.highlightText}"`
            : 'Element highlight skipped',
          placeholderData: { highlightSelector: step.highlightSelector },
        },
        skipAllowed: true,
        retryAllowed: false, // If element doesn't exist, retry won't help
      };

    case 'trigger-event':
      return {
        stepId: step.id,
        fallbackContent: {
          ...baseFallback,
          recoveryMessage: `Event simulation: ${step.eventType}`,
          placeholderData: step.eventPayload || {},
        },
        skipAllowed: true,
        retryAllowed: true,
      };

    case 'narrate':
      return {
        stepId: step.id,
        fallbackContent: {
          ...baseFallback,
          recoveryMessage: step.narration || 'Narration step',
          placeholderData: { narration: step.narration },
        },
        skipAllowed: true,
        retryAllowed: false, // Narration is just text
      };

    case 'wait':
      return {
        stepId: step.id,
        fallbackContent: {
          ...baseFallback,
          recoveryMessage: 'Pause step',
          placeholderData: { duration: step.duration },
        },
        skipAllowed: true,
        retryAllowed: false,
      };

    default:
      return {
        stepId: step.id,
        fallbackContent: baseFallback,
        skipAllowed: true,
        retryAllowed: false,
      };
  }
}

// ============================================================================
// EVENT FALLBACK HANDLERS
// Generate fallback events when real events can't be triggered
// ============================================================================

export function createFallbackEvent(
  eventType: CrossModuleEventType,
  sourceModule: ModuleId,
  payload?: Record<string, unknown>
): {
  id: string;
  type: CrossModuleEventType;
  sourceModule: ModuleId;
  targetModules: ModuleId[];
  payload: Record<string, unknown>;
  timestamp: string;
  isFallback: true;
} {
  // Map event types to their typical target modules
  const eventTargets: Record<string, ModuleId[]> = {
    'preclinical-study-completed': ['safety', 'regulatory'],
    'label-change-recommended': ['labeling', 'submissions'],
    'document-finalized': ['submissions', 'tmf'],
    'csr-completed': ['submissions', 'regulatory'],
    'safety-signal-detected': ['labeling', 'regulatory'],
  };

  return {
    id: `fallback-${eventType}-${Date.now()}`,
    type: eventType,
    sourceModule,
    targetModules: eventTargets[eventType] || ['regulatory'],
    payload: payload || { fallback: true, simulatedAt: new Date().toISOString() },
    timestamp: new Date().toISOString(),
    isFallback: true,
  };
}

// ============================================================================
// RECOVERY STRATEGIES
// Different approaches to recovering from demo failures
// ============================================================================

export type RecoveryStrategy = 
  | 'skip'           // Skip the failed step and continue
  | 'retry'          // Retry the step
  | 'substitute'     // Use fallback data/action
  | 'pause'          // Pause demo for manual intervention
  | 'abort';         // Stop the demo

export interface RecoveryAction {
  strategy: RecoveryStrategy;
  message: string;
  data?: Record<string, unknown>;
}

export function determineRecoveryStrategy(
  step: ScenarioStep,
  error: Error
): RecoveryAction {
  const fallback = getStepFallback(step);

  // For navigation errors, try to substitute
  if (step.action === 'navigate') {
    return {
      strategy: 'substitute',
      message: `Showing placeholder for ${step.module} module`,
      data: MODULE_FALLBACK_DATA[step.module]?.placeholderData,
    };
  }

  // For highlight errors (element not found), skip
  if (step.action === 'highlight') {
    return {
      strategy: 'skip',
      message: fallback.fallbackContent.recoveryMessage,
    };
  }

  // For event triggers, substitute with fallback event
  if (step.action === 'trigger-event' && step.eventType) {
    return {
      strategy: 'substitute',
      message: `Simulating ${step.eventType} event`,
      data: createFallbackEvent(
        step.eventType as CrossModuleEventType,
        step.module as ModuleId,
        step.eventPayload
      ),
    };
  }

  // For narration, just skip - the presenter can fill in
  if (step.action === 'narrate') {
    return {
      strategy: 'skip',
      message: 'Narration step skipped - presenter will cover',
    };
  }

  // Default: skip and continue
  return {
    strategy: 'skip',
    message: 'Step skipped due to error',
  };
}

// ============================================================================
// DEMO HEALTH STATUS
// Track overall demo health and ability to continue
// ============================================================================

export interface DemoHealthStatus {
  healthy: boolean;
  degraded: boolean;
  failedSteps: string[];
  skippedSteps: string[];
  fallbacksUsed: number;
  canContinue: boolean;
  recommendedAction: 'continue' | 'pause' | 'restart' | 'abort';
}

export function assessDemoHealth(
  totalSteps: number,
  failedSteps: string[],
  skippedSteps: string[]
): DemoHealthStatus {
  const failureRate = failedSteps.length / totalSteps;
  const skipRate = skippedSteps.length / totalSteps;

  // If more than 50% of steps failed, recommend abort
  if (failureRate > 0.5) {
    return {
      healthy: false,
      degraded: true,
      failedSteps,
      skippedSteps,
      fallbacksUsed: failedSteps.length + skippedSteps.length,
      canContinue: false,
      recommendedAction: 'abort',
    };
  }

  // If more than 30% failed, recommend restart
  if (failureRate > 0.3) {
    return {
      healthy: false,
      degraded: true,
      failedSteps,
      skippedSteps,
      fallbacksUsed: failedSteps.length + skippedSteps.length,
      canContinue: true,
      recommendedAction: 'restart',
    };
  }

  // If any steps failed, demo is degraded but can continue
  if (failedSteps.length > 0) {
    return {
      healthy: false,
      degraded: true,
      failedSteps,
      skippedSteps,
      fallbacksUsed: failedSteps.length + skippedSteps.length,
      canContinue: true,
      recommendedAction: 'continue',
    };
  }

  // If only skipped steps, might be intentional
  if (skippedSteps.length > 0) {
    return {
      healthy: true,
      degraded: skipRate > 0.2,
      failedSteps,
      skippedSteps,
      fallbacksUsed: skippedSteps.length,
      canContinue: true,
      recommendedAction: 'continue',
    };
  }

  // All good!
  return {
    healthy: true,
    degraded: false,
    failedSteps: [],
    skippedSteps: [],
    fallbacksUsed: 0,
    canContinue: true,
    recommendedAction: 'continue',
  };
}

export default {
  MODULE_FALLBACK_DATA,
  getStepFallback,
  createFallbackEvent,
  determineRecoveryStrategy,
  assessDemoHealth,
};
