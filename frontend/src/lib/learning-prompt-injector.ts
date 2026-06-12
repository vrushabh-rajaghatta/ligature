// =============================================================================
// LEARNING PROMPT INJECTOR — v0.112.0
// =============================================================================
// Gap 7 fix: reads per-agent calibration data from the learning store and
// appends a concise "Recent calibration notes" section to the agent's system
// prompt at run time.
//
// This closes the loop: human review decisions → learning store →
// calibration metrics → system prompt → better future decisions.
//
// Notes are only injected when there is meaningful signal (≥3 feedback items).
// The injected text is short and factual — never prescriptive enough to
// override the agent's regulatory judgment, only to surface patterns.
// =============================================================================

import { computeCalibration, listFeedback } from '@/lib/learning-store';
import type { AgentId } from '@/types/agents';

const MIN_FEEDBACK_FOR_INJECTION = 3;
const MAX_REJECTION_EXAMPLES = 2;

export function buildCalibratedSystemPrompt(
  agentId: AgentId,
  baseSystemPrompt: string,
  tenantId: string
): string {
  try {
    const calibration = computeCalibration(agentId, tenantId);

    // Not enough signal yet — use the base prompt unchanged
    if (calibration.totalDecisions < MIN_FEEDBACK_FOR_INJECTION) {
      return baseSystemPrompt;
    }

    const lines: string[] = [
      '',
      '---',
      '## Recent calibration notes (auto-generated from human review decisions)',
      '',
    ];

    // Overall quality signal
    if (calibration.avgDraftQuality >= 4.0) {
      lines.push(`Your recent drafts have been rated highly (avg quality ${calibration.avgDraftQuality.toFixed(1)}/5). Maintain this standard.`);
    } else if (calibration.avgDraftQuality < 3.0 && calibration.avgDraftQuality > 0) {
      lines.push(`Recent drafts have scored below expectations (avg quality ${calibration.avgDraftQuality.toFixed(1)}/5). Focus on thoroughness and regulatory citation.`);
    }

    // Risk calibration
    if (!calibration.riskAgreementRate || calibration.riskAgreementRate < 0.75) {
      lines.push(`Reviewers have disagreed with your risk classification in ${Math.round((1 - (calibration.riskAgreementRate ?? 0)) * 100)}% of cases. Re-read the risk level definitions before classifying.`);
    }

    // Rejection patterns
    const recentFeedback = listFeedback({ agentId, tenantId, limit: 20 });
    const rejections = recentFeedback.filter(f => f.outcome === 'rejected');

    if (rejections.length > 0) {
      lines.push('');
      lines.push('Recent rejection reasons (learn from these):');
      rejections.slice(0, MAX_REJECTION_EXAMPLES).forEach(f => {
        if (f.rejectionCategory) {
          lines.push(`- ${formatRejectionCategory(f.rejectionCategory)}${f.improvementNote ? `: ${f.improvementNote.slice(0, 120)}` : ''}`);
        }
      });
    }

    // Modification patterns
    const modifications = recentFeedback.filter(f => f.outcome === 'modified' && f.modificationSummary);
    if (modifications.length > 0) {
      lines.push('');
      lines.push('Common reviewer modifications:');
      modifications.slice(0, 2).forEach(f => {
        lines.push(`- ${f.modificationSummary!.slice(0, 120)}`);
      });
    }

    // Calibration status banner
    if (calibration.calibrationStatus === 'recalibration-required') {
      lines.push('');
      lines.push('⚠ This agent is flagged for recalibration. Apply extra care to risk classification and completeness.');
    }

    lines.push('---');

    return baseSystemPrompt + lines.join('\n');
  } catch (e) {
    // Never let learning injection crash the agent run
    console.error('[learning-prompt-injector] Failed to build calibrated prompt:', e);
    return baseSystemPrompt;
  }
}

function formatRejectionCategory(cat: string): string {
  const labels: Record<string, string> = {
    'wrong-risk-level': 'Incorrect risk classification',
    'incomplete-analysis': 'Incomplete analysis',
    'wrong-recommendation': 'Wrong recommendation',
    'hallucination': 'Hallucinated content — always cite real data',
    'other': 'Other reviewer concern',
  };
  return labels[cat] ?? cat;
}
