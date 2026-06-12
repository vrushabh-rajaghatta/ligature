
/**
 * ContextBar — v0.125.37
 *
 * Reads raw state fields from useActiveScopeStore directly —
 * never calls store actions inside selectors (that caused React #300).
 */

import { Layers } from 'lucide-react';
import { useActiveScopeStore } from '@/store/useActiveScopeStore';
import { getStudyById, getApplicationById } from '@/data/scopeData';
import { THERAPEUTIC_AREAS } from '@/data/referenceData';

export const CONTEXT_BAR_MODULES = new Set([
  'study-design', 'ctms', 'tmf', 'authoring', 'document-control',
  'safety', 'signal-detection', 'haq', 'submission-command', 'submissions-hub',
  'publishing', 'cmc', 'stability', 'batch-records', 'labeling', 'spl',
  'strategy', 'reg-calendar', 'continuous-submission', 'glp', 'qms',
  'analytics', 'study-intel', 'psmf', 'medical-affairs', 'supply-chain',
  'biostats', 'translational', 'nonclinical', 'edc', 'sample-management',
]);

interface ContextBarProps {
  activeModule: string;
}

export function ContextBar({ activeModule }: ContextBarProps) {
  // Read raw state — never call actions inside selectors
  const scopeLevel       = useActiveScopeStore(s => s.scopeLevel);
  const therapeuticAreaId = useActiveScopeStore(s => s.therapeuticAreaId);
  const programId        = useActiveScopeStore(s => s.programId);
  const studyId          = useActiveScopeStore(s => s.studyId);
  const devApplicationId = useActiveScopeStore(s => s.devApplicationId);
  const marketingAuthId  = useActiveScopeStore(s => s.marketingAuthId);
  const regionCode       = useActiveScopeStore(s => s.regionCode);
  const countryCode      = useActiveScopeStore(s => s.countryCode);

  // Derive display values from raw state (no store actions called)
  let label = '—';
  let flag  = '🔬';

  if (scopeLevel === 'ta') {
    const ta = THERAPEUTIC_AREAS.find(t => t.id === therapeuticAreaId);
    label = ta?.name ?? 'All Areas';
    flag  = ta?.icon ?? '🔬';
  } else if (scopeLevel === 'study' && studyId) {
    const study = getStudyById(studyId);
    label = study ? `${study.protocolNumber} · ${study.phase}` : studyId;
    flag  = '🔬';
  } else if (scopeLevel === 'auth' && (marketingAuthId || devApplicationId)) {
    const app = getApplicationById(marketingAuthId ?? devApplicationId ?? '');
    label = app ? `${app.applicationNumber} · ${app.type}` : '—';
    flag  = app?.regionFlag ?? '📄';
  } else if (scopeLevel === 'region' && regionCode) {
    label = regionCode;
    flag  = '🌐';
  } else if (scopeLevel === 'country' && countryCode) {
    label = countryCode;
    flag  = '📍';
  } else if (programId) {
    label = programId.toUpperCase();
    flag  = '💊';
  }

  // Gate — after all hooks
  if (!CONTEXT_BAR_MODULES.has(activeModule)) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-surface border-b border-border flex-shrink-0">
      <Layers className="w-3 h-3 text-text-muted flex-shrink-0" />
      <span className="text-xs text-text-muted">Scope:</span>
      <span className="text-xs font-medium text-text-secondary flex items-center gap-1">
        <span>{flag}</span>
        <span>{label}</span>
      </span>
      <span className="text-xs text-text-muted capitalize ml-1 px-1.5 py-0.5 bg-surface-card rounded border border-border">
        {scopeLevel}
      </span>
      <span className="text-xs text-accent-blue ml-auto opacity-60">
        Change in scope selector →
      </span>
    </div>
  );
}
