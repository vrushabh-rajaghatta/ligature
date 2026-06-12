
/**
 * Cascade Engine Types — v0.44.40
 *
 * Data model for intelligent cross-module event cascading.
 * Defines trigger events, downstream tasks, risk levels, and
 * confirmation requirements.
 *
 * Build order:
 *   v0.44.40 — Types only (this file)
 *   v0.44.41 — useCascadeEngine store
 *   v0.44.42 — Safety Signal chain wired
 *   v0.44.43 — Action Center causality display
 */

import type { ModuleId } from '@/types/core';
import type { TaskPriority } from './useTaskAggregationStore';

// ─────────────────────────────────────────────
// Risk levels determine confirmation behaviour
// ─────────────────────────────────────────────
export type CascadeRisk =
  | 'low'     // Fires automatically, silent — creates scaffolding only
  | 'medium'  // Fires automatically + emits smart notification banner
  | 'high';   // Pauses for user confirmation modal before firing

// ─────────────────────────────────────────────
// Trigger event — something that happened in
// a source module that may spawn downstream work
// ─────────────────────────────────────────────
export type CascadeTriggerType =
  | 'safety-signal-confirmed'       // Signal elevated to confirmed
  | 'safety-signal-closed'          // Signal resolved
  | 'db-lock-completed'             // CTMS clinical DB locked
  | 'protocol-approved'             // Authoring protocol doc approved
  | 'haq-received'                  // New HAQ received from agency
  | 'haq-response-submitted'        // HAQ response sent to agency
  | 'capa-completed'                // QMS CAPA closed out
  | 'submission-approved'           // Regulatory approval received
  | 'document-approved'             // Any document reaches approved state
  | 'glp-study-finalized';          // GLP nonclinical study finalized — 6-module cascade

export interface CascadeTriggerEvent {
  id: string;                       // Unique event ID
  type: CascadeTriggerType;
  sourceModule: ModuleId;
  sourceId: string;                 // ID of the thing that changed
  sourceLabel: string;              // Human-readable — "Signal SIG-024 Hepatotoxicity"
  triggeredAt: string;              // ISO timestamp
  triggeredBy: string;              // User ID or 'system'
  metadata: Record<string, unknown>; // Event-specific payload
}

// ─────────────────────────────────────────────
// Cascade step — one downstream action spawned
// by a trigger event
// ─────────────────────────────────────────────
export type CascadeStepStatus =
  | 'pending'     // Waiting for confirmation (high-risk) or queued
  | 'spawned'     // Task/action created in target module
  | 'skipped'     // User declined this step
  | 'completed';  // Downstream task is done

export interface CascadeStep {
  id: string;
  targetModule: ModuleId;
  title: string;                    // e.g. "Draft CAPA in QMS"
  description: string;              // e.g. "Create investigation for confirmed safety signal"
  risk: CascadeRisk;
  priority: TaskPriority;
  status: CascadeStepStatus;
  spawnedTaskId?: string;           // ID in target module once created
  estimatedDaysToComplete?: number;
  automated?: boolean;
}

// ─────────────────────────────────────────────
// Cascade chain — a trigger + all its steps,
// grouped as one logical unit
// ─────────────────────────────────────────────
export type CascadeChainStatus =
  | 'preview'     // High-risk chain awaiting user confirmation
  | 'running'     // Steps being spawned
  | 'complete'    // All steps spawned/skipped
  | 'dismissed';  // User dismissed the whole chain

export interface CascadeChain {
  id: string;
  trigger: CascadeTriggerEvent;
  steps: CascadeStep[];
  status: CascadeChainStatus;
  createdAt: string;
  completedAt?: string;
  triggerLabel?: string;
  triggerType?: CascadeTriggerType;

  // Computed helpers
  pendingSteps: number;
  spawnedSteps: number;
  requiresConfirmation: boolean;    // true if any step is high-risk
}

// ─────────────────────────────────────────────
// Chain definitions — declarative map of
// trigger type → expected downstream steps
// Used by the engine to know what to spawn
// ─────────────────────────────────────────────
export interface CascadeChainDefinition {
  triggerType: CascadeTriggerType;
  label: string;
  description: string;
  steps: Omit<CascadeStep, 'id' | 'status' | 'spawnedTaskId'>[];
}

export const CASCADE_CHAIN_DEFINITIONS: CascadeChainDefinition[] = [
  {
    triggerType: 'safety-signal-confirmed',
    label: 'Safety Signal Confirmed',
    description: 'A safety signal has been elevated to confirmed status',
    steps: [
      {
        targetModule: 'qms',
        title: 'Open CAPA Investigation',
        description: 'Create a CAPA in QMS to investigate the confirmed safety signal',
        risk: 'low',
        priority: 'high',
        estimatedDaysToComplete: 14,
      },
      {
        targetModule: 'authoring',
        title: 'Review Labeling Section 4.4',
        description: 'Initiate labeling review — special warnings and precautions may need updating',
        risk: 'medium',
        priority: 'high',
        estimatedDaysToComplete: 21,
      },
      {
        targetModule: 'submissions',
        title: 'Flag Active Submission for Potential Amendment',
        description: 'Mark any in-progress submissions for regulatory impact assessment',
        risk: 'high',
        priority: 'critical',
        estimatedDaysToComplete: 7,
      },
      {
        targetModule: 'haq',
        title: 'Review Open HAQ Responses for Signal Impact',
        description: 'Check if any in-progress HAQ responses reference the affected compound and need updating before submission',
        risk: 'medium',
        priority: 'high',
        estimatedDaysToComplete: 5,
      },
    ],
  },
  {
    triggerType: 'db-lock-completed',
    label: 'Clinical Database Locked',
    description: 'CTMS clinical database lock completed — CTD assembly can begin',
    steps: [
      {
        targetModule: 'authoring',
        title: 'Initiate Clinical Study Report Authoring',
        description: 'Spawn CSR authoring tasks for locked study data',
        risk: 'low',
        priority: 'high',
        estimatedDaysToComplete: 30,
      },
      {
        targetModule: 'submissions',
        title: 'Advance Submission Milestone: Clinical Package',
        description: 'Mark the clinical data package milestone as ready to begin',
        risk: 'low',
        priority: 'medium',
        estimatedDaysToComplete: 5,
      },
    ],
  },
  {
    triggerType: 'protocol-approved',
    label: 'Study Protocol Approved',
    description: 'A study protocol has been approved in Authoring',
    steps: [
      {
        targetModule: 'tmf',
        title: 'Seed TMF Structure',
        description: 'Auto-create TMF zone/section scaffold for this study',
        risk: 'low',
        priority: 'medium',
        estimatedDaysToComplete: 1,
      },
      {
        targetModule: 'ctms',
        title: 'Create CTMS Study Record',
        description: 'Initialise study in CTMS with protocol metadata',
        risk: 'low',
        priority: 'high',
        estimatedDaysToComplete: 2,
      },
    ],
  },
  {
    triggerType: 'haq-response-submitted',
    label: 'HAQ Response Submitted',
    description: 'A Health Authority Question response has been submitted',
    steps: [
      {
        targetModule: 'submissions',
        title: 'Assess eCTD Amendment Requirement',
        description: 'Determine if the HAQ response warrants an eCTD sequence amendment',
        risk: 'high',
        priority: 'high',
        estimatedDaysToComplete: 5,
      },
    ],
  },
  // ── v0.57.0: GLP Study Finalized — 6-module flagship cascade ──────────────
  {
    triggerType: 'glp-study-finalized',
    label: 'GLP Study Finalized',
    description: 'A GLP nonclinical study has been finalized — triggers 6-module cascade across safety, regulatory, authoring, HAQ, and clinical',
    steps: [
      {
        targetModule: 'safety',
        title: 'Create Safety Surveillance Case',
        description: 'Auto-generate a pharmacovigilance case shell from GLP findings with compound, dose, and toxicology data pre-populated',
        risk: 'low',
        priority: 'high',
        estimatedDaysToComplete: 1,
      },
      {
        targetModule: 'regulatory' as any,
        title: 'Flag IND for Nonclinical Update',
        description: 'Mark IND nonclinical section for required update — pre-draft amendment request linked to finalized study report',
        risk: 'medium',
        priority: 'high',
        estimatedDaysToComplete: 7,
      },
      {
        targetModule: 'authoring',
        title: 'Queue CSR Section 12.2 Draft',
        description: 'Open AI-assisted authoring task for CSR Nonclinical Summary (Section 12.2) with structured GLP data imported',
        risk: 'low',
        priority: 'medium',
        estimatedDaysToComplete: 14,
      },
      {
        targetModule: 'haq',
        title: 'Predict Probable FDA Question',
        description: 'HAQ Intelligence analyzes the findings against 800+ prior FDA interactions to pre-draft the probable health authority question and response',
        risk: 'low',
        priority: 'high',
        estimatedDaysToComplete: 2,
      },
      {
        targetModule: 'ctms',
        title: 'Flag Protocol Amendment for Review',
        description: 'Notify clinical team that monitoring plan may require amendment based on nonclinical findings — pre-populate amendment shell',
        risk: 'medium',
        priority: 'high',
        estimatedDaysToComplete: 21,
      },
      {
        targetModule: 'submissions',
        title: 'Update Module 4 eCTD Section',
        description: 'Link finalized GLP study report to active NDA Module 4 — advance nonclinical package readiness milestone',
        risk: 'low',
        priority: 'medium',
        estimatedDaysToComplete: 5,
      },
    ],
  },
];
