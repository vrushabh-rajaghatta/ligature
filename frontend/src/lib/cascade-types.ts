// =============================================================================
// CASCADE TYPES — v0.113.0
// =============================================================================
// Shared result types used by cascade-orchestrator.ts, ind-nda-chain.ts,
// and cascade-resume.ts. Kept here so neither cascade file imports the other.
// =============================================================================

export interface CascadeStepResult {
  agentId: string;
  runId: string;
  status: string;
  riskLevel: string | null;
  autopilot: boolean;
  summary: string;
  draftOutput: unknown;
}

export interface CascadeResult {
  cascadeId: string;
  cascadeType: string;
  status: 'completed' | 'suspended' | 'failed';
  steps: CascadeStepResult[];
  suspendedAtStep?: number;
  blockedByReviewIds?: string[];
  totalDurationMs: number;
  startedAt: string;
  completedAt: string;
  error?: string;
}
