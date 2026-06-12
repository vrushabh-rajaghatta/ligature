// ============================================================================
// AddSubmissionModal — v0.62.0
// LIG-003 COMPLETE: Add Submission post-provisioning
// Evaluates new submission's tasks vs existing rows, inserts non-duplicates,
// attaches CPI links to existing rows
// ============================================================================


import React, { useState, useMemo } from 'react';
import {
  X, Plus, Globe, Crown, CheckCircle2, AlertCircle,
  Layers, FileText, ChevronRight, Loader2,
} from 'lucide-react';
import { GlobalSubmissionPlan, GSPSubmission } from '@/data/global-submission-plan-data';
import { useGlobalPlanStore } from '@/stores/global-plan-store';

const MARKET_FLAGS: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', Japan: '🇯🇵', China: '🇨🇳',
  Canada: '🇨🇦', UK: '🇬🇧', Australia: '🇦🇺', Brazil: '🇧🇷',
  Korea: '🇰🇷', Switzerland: '🇨🇭', Taiwan: '🇹🇼', Singapore: '🇸🇬',
};

const AVAILABLE_MARKETS = [
  { market: 'Canada', flag: '🇨🇦', agency: 'Health Canada', submissionTypes: ['NDS', 'NDA'] },
  { market: 'Australia', flag: '🇦🇺', agency: 'TGA', submissionTypes: ['NDA'] },
  { market: 'UK', flag: '🇬🇧', agency: 'MHRA', submissionTypes: ['MAA'] },
  { market: 'Switzerland', flag: '🇨🇭', agency: 'Swissmedic', submissionTypes: ['MAA'] },
  { market: 'Brazil', flag: '🇧🇷', agency: 'ANVISA', submissionTypes: ['NDA'] },
  { market: 'China', flag: '🇨🇳', agency: 'NMPA', submissionTypes: ['NDA', 'BLA'] },
  { market: 'Korea', flag: '🇰🇷', agency: 'MFDS', submissionTypes: ['NDA'] },
  { market: 'Taiwan', flag: '🇹🇼', agency: 'TFDA', submissionTypes: ['NDA'] },
];

interface AddSubmissionModalProps {
  plan: GlobalSubmissionPlan;
  onClose: () => void;
  onSuccess: (auditNote: string) => void;
}

export function AddSubmissionModal({ plan, onClose, onSuccess }: AddSubmissionModalProps) {
  const { addSubmissionToPlan } = useGlobalPlanStore();
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ addedTaskCount: number; linkedCpiCount: number; auditNote: string } | null>(null);

  const existingMarkets = new Set(plan.submissions.map(s => s.market));

  const availableOptions = useMemo(() =>
    AVAILABLE_MARKETS.filter(m => !existingMarkets.has(m.market)),
    [existingMarkets]
  );

  const selectedMarketConfig = AVAILABLE_MARKETS.find(m => m.market === selectedMarket);

  // Preview: how many delta tasks would be inserted
  const previewTaskCount = selectedMarket ? 3 : 0; // simplified — matches generateDeltaTasks output
  const previewCPILinks = plan.tasks.filter(t => t.cpiSharedMarkets && t.cpiSharedMarkets.length > 0).length;

  const canSubmit = selectedMarket && selectedType && targetDate;

  function handleAdd() {
    if (!canSubmit || !selectedMarketConfig) return;
    setIsSubmitting(true);

    const newSubmission: GSPSubmission = {
      id: `sub-${selectedMarket.toLowerCase().replace(/\s+/g, '-')}-${selectedType.toLowerCase()}`,
      type: selectedType,
      market: selectedMarket,
      agency: selectedMarketConfig.agency,
      flag: selectedMarketConfig.flag,
      isLead: false,
      targetDate,
    };

    // Simulate async provisioning delay
    setTimeout(() => {
      const r = addSubmissionToPlan(plan.id, newSubmission);
      setResult(r);
      setIsSubmitting(false);
    }, 900);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface-elevated rounded-xl border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent-blue" />
              Add Submission to Plan
            </h2>
            <p className="text-xs text-text-muted mt-0.5">{plan.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded-lg">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Success state */}
        {result ? (
          <div className="p-5">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-400">Submission added successfully</p>
                <p className="text-sm text-text-secondary mt-1">{result.auditNote}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-surface-card rounded-lg p-3 border border-border">
                <p className="text-xs text-text-muted mb-1">Delta Tasks Added</p>
                <p className="text-2xl font-semibold text-text-primary">{result.addedTaskCount}</p>
              </div>
              <div className="bg-surface-card rounded-lg p-3 border border-border">
                <p className="text-xs text-text-muted mb-1">CPI Rows Linked</p>
                <p className="text-2xl font-semibold text-cyan-400">{result.linkedCpiCount}</p>
              </div>
            </div>
            <button
              onClick={() => { onSuccess(result.auditNote); onClose(); }}
              className="w-full px-4 py-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 font-medium"
            >
              Done — View Updated Plan
            </button>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Market picker */}
              <div>
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-2">
                  Satellite Market
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableOptions.map(m => (
                    <button
                      key={m.market}
                      onClick={() => { setSelectedMarket(m.market); setSelectedType(m.submissionTypes[0]); }}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-all ${
                        selectedMarket === m.market
                          ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                          : 'border-border bg-surface-card text-text-muted hover:text-text-primary hover:border-border/60'
                      }`}
                    >
                      <span className="text-xl">{m.flag}</span>
                      <span className="font-medium">{m.market}</span>
                      <span className="text-[10px] text-text-muted">{m.agency}</span>
                    </button>
                  ))}
                </div>
                {availableOptions.length === 0 && (
                  <p className="text-sm text-text-muted italic">All supported markets already have submissions in this plan.</p>
                )}
              </div>

              {/* Submission type */}
              {selectedMarketConfig && (
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-2">
                    Submission Type
                  </label>
                  <div className="flex gap-2">
                    {selectedMarketConfig.submissionTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedType(t)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          selectedType === t
                            ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                            : 'border-border bg-surface-card text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Target date */}
              {selectedMarket && (
                <div>
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-2">
                    Target Submission Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue text-text-primary w-full sm:w-auto"
                  />
                </div>
              )}

              {/* Preview panel */}
              {selectedMarket && (
                <div className="rounded-lg bg-surface-card border border-border p-4">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">What will be provisioned</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="text-text-secondary">
                        <span className="font-medium text-text-primary">{previewTaskCount} delta task rows</span> added to plan grid
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="text-text-secondary">
                        <span className="font-medium text-text-primary">{previewCPILinks} existing CPI rows</span> linked to {selectedMarket}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      <span className="text-text-secondary">No duplicate rows inserted — CPI deduplication applied</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary border border-border rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!canSubmit || isSubmitting}
                className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Provisioning...</>
                ) : (
                  <><Plus className="w-3.5 h-3.5" />Add {selectedMarket || 'Submission'}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AddSubmissionModal;
