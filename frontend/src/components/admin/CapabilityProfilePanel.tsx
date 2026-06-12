
/**
 * CapabilityProfilePanel — Organizational Capability Profile
 * v0.125.82
 *
 * Admin-gated panel for viewing and editing the org capability profile across
 * 5 dimensions. Platform-inferred scores are derived from Ligature module
 * activity. Self-reported scores are editable by admin only.
 * Composite scores feed into CandidateTargeting internalCapability ranking.
 */

import { useState, useCallback } from 'react';
import {
  FlaskRound, Microscope, Factory, Globe, Stethoscope,
  RefreshCw, Save, Info, ChevronDown, ChevronUp,
  CheckCircle, TrendingUp, TrendingDown, Minus,
  Sparkles, Shield, BarChart3, Edit3, RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useCapabilityProfileStore,
  type CapabilityDimensionId,
  type CapabilityDimension,
} from '@/store/useCapabilityProfileStore';

// ── Dimension config ───────────────────────────────────────────────────────────

const DIM_META: Record<CapabilityDimensionId, { icon: React.ReactNode; color: string; accentBg: string; accentBorder: string; accentText: string }> = {
  chemistry:     { icon: <FlaskRound   className="w-4 h-4" />, color: 'violet', accentBg: 'bg-violet-500/10',  accentBorder: 'border-violet-500/20',  accentText: 'text-violet-400' },
  biology:       { icon: <Microscope   className="w-4 h-4" />, color: 'teal',   accentBg: 'bg-teal-500/10',    accentBorder: 'border-teal-500/20',    accentText: 'text-teal-400' },
  manufacturing: { icon: <Factory      className="w-4 h-4" />, color: 'amber',  accentBg: 'bg-amber-500/10',   accentBorder: 'border-amber-500/20',   accentText: 'text-amber-400' },
  regulatory:    { icon: <Globe        className="w-4 h-4" />, color: 'emerald',accentBg: 'bg-emerald-500/10', accentBorder: 'border-emerald-500/20', accentText: 'text-emerald-400' },
  clinical:      { icon: <Stethoscope  className="w-4 h-4" />, color: 'blue',   accentBg: 'bg-blue-500/10',    accentBorder: 'border-blue-500/20',    accentText: 'text-blue-400' },
};

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ value, color = 'bg-accent-blue', height = 'h-1.5' }: { value: number; color?: string; height?: string }) {
  return (
    <div className={`${height} bg-surface-elevated rounded-full overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function ScoreChip({ value }: { value: number }) {
  const color = value >= 85 ? 'text-emerald-400' : value >= 70 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-sm font-bold ${color}`}>{value}</span>;
}

function DeltaIndicator({ self, inferred }: { self: number; inferred: number }) {
  const diff = inferred - self;
  if (Math.abs(diff) < 3) return <Minus className="w-3 h-3 text-text-muted" />;
  if (diff > 0) return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  return <TrendingDown className="w-3 h-3 text-amber-400" />;
}

// ── Slider input ──────────────────────────────────────────────────────────────

function ScoreSlider({
  value, onChange, disabled,
}: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0} max={100} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className="flex-1 h-1.5 accent-violet-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      />
      <input
        type="number"
        min={0} max={100}
        value={value}
        onChange={e => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
        disabled={disabled}
        className="w-12 px-1 py-0.5 text-xs text-center bg-surface border border-border rounded text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500/50 disabled:opacity-50"
      />
    </div>
  );
}

// ── Dimension card ────────────────────────────────────────────────────────────

function DimensionCard({
  dim,
  isEditing,
  onSelfChange,
  onSubChange,
}: {
  dim:          CapabilityDimension;
  isEditing:    boolean;
  onSelfChange: (id: CapabilityDimensionId, v: number) => void;
  onSubChange:  (id: CapabilityDimensionId, label: string, v: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = DIM_META[dim.id];

  const barColor =
    dim.composite >= 85 ? 'bg-emerald-500' :
    dim.composite >= 70 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className={`rounded-xl border ${meta.accentBorder} bg-surface-card overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-elevated/30 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg ${meta.accentBg} flex items-center justify-center ${meta.accentText} flex-shrink-0`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary">{dim.label}</div>
          <div className="text-[10px] text-text-muted mt-0.5 truncate">{dim.description}</div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Self vs Inferred delta */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-text-muted">
            <span>Self {dim.selfReported}</span>
            <DeltaIndicator self={dim.selfReported} inferred={dim.platformInferred} />
            <span>Inferred {dim.platformInferred}</span>
          </div>
          {/* Composite score */}
          <div className="text-right">
            <ScoreChip value={dim.composite} />
            <div className="text-[9px] text-text-muted">/ 100</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </div>
      </button>

      {/* Composite bar */}
      <div className="px-4 pb-1">
        <ScoreBar value={dim.composite} color={barColor} height="h-1" />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-border/40 space-y-4">

          {/* Score comparison grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-lg ${meta.accentBg} border ${meta.accentBorder} p-3 text-center`}>
              <div className="text-[10px] text-text-muted mb-1 flex items-center justify-center gap-1">
                <Edit3 className="w-2.5 h-2.5" /> Self-reported
              </div>
              <div className={`text-xl font-bold ${meta.accentText}`}>{dim.selfReported}</div>
            </div>
            <div className="rounded-lg bg-surface-elevated p-3 text-center">
              <div className="text-[10px] text-text-muted mb-1 flex items-center justify-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Platform inferred
              </div>
              <div className="text-xl font-bold text-text-primary">{dim.platformInferred}</div>
            </div>
            <div className="rounded-lg bg-surface-elevated p-3 text-center">
              <div className="text-[10px] text-text-muted mb-1">Composite (60/40)</div>
              <div className={`text-xl font-bold ${dim.composite >= 85 ? 'text-emerald-400' : dim.composite >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{dim.composite}</div>
            </div>
          </div>

          {/* Self-reported slider */}
          {isEditing && (
            <div>
              <label className="text-[10px] text-text-muted uppercase tracking-wider font-semibold block mb-2">
                Adjust self-reported score
              </label>
              <ScoreSlider
                value={dim.selfReported}
                onChange={v => onSelfChange(dim.id, v)}
                disabled={false}
              />
            </div>
          )}

          {/* Sub-scores */}
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-3">
              Sub-dimension breakdown
            </div>
            <div className="space-y-3">
              {dim.subScores.map(sub => (
                <div key={sub.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sub.source === 'inferred' ? 'bg-emerald-400' : 'bg-violet-400'}`} />
                      <span className="text-[11px] text-text-secondary">{sub.label}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${sub.source === 'inferred' ? 'text-emerald-400 bg-emerald-500/10' : 'text-violet-400 bg-violet-500/10'}`}>
                        {sub.source}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-text-primary">{sub.value}</span>
                  </div>
                  {isEditing && sub.source === 'self' ? (
                    <ScoreSlider
                      value={sub.value}
                      onChange={v => onSubChange(dim.id, sub.label, v)}
                      disabled={false}
                    />
                  ) : (
                    <ScoreBar
                      value={sub.value}
                      color={sub.value >= 85 ? 'bg-emerald-500' : sub.value >= 70 ? 'bg-amber-500' : 'bg-red-500'}
                    />
                  )}
                  <div className="text-[10px] text-text-muted/70 mt-1">{sub.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-text-muted/60">
            Last updated {new Date(dim.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {dim.updatedBy}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Overall spider / radar summary ────────────────────────────────────────────

function CapabilityRadar({ dims }: { dims: Record<CapabilityDimensionId, CapabilityDimension> }) {
  const order: CapabilityDimensionId[] = ['regulatory', 'chemistry', 'biology', 'clinical', 'manufacturing'];
  const cx = 120, cy = 120, r = 90;
  const n = order.length;

  const point = (i: number, score: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const radius = (score / 100) * r;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const labelPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + (r + 18) * Math.cos(angle), y: cy + (r + 18) * Math.sin(angle) };
  };

  const rings = [25, 50, 75, 100];
  const compositePoints = order.map((id, i) => point(i, dims[id].composite));
  const polyline = compositePoints.map(p => `${p.x},${p.y}`).join(' ');
  const axisPoints = order.map((_, i) => point(i, 100));

  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[240px] mx-auto">
      {/* Rings */}
      {rings.map(pct => {
        const ringPts = order.map((_, i) => {
          const a = (Math.PI * 2 * i) / n - Math.PI / 2;
          const rr = (pct / 100) * r;
          return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
        }).join(' ');
        return <polygon key={pct} points={ringPts} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />;
      })}

      {/* Axes */}
      {axisPoints.map((pt, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="currentColor" strokeWidth="0.5" className="text-border" />
      ))}

      {/* Composite polygon */}
      <polygon
        points={polyline}
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-violet-400"
      />

      {/* Dots */}
      {compositePoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="currentColor" className="text-violet-400" />
      ))}

      {/* Labels */}
      {order.map((id, i) => {
        const lp = labelPoint(i);
        const meta = DIM_META[id];
        const score = dims[id].composite;
        return (
          <text key={id} x={lp.x} y={lp.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fill="currentColor" className="text-text-muted"
          >
            <tspan x={lp.x} dy="-5">{dims[id].label.split(' ')[0]}</tspan>
            <tspan x={lp.x} dy="11" fontWeight="bold" fontSize="9"
              className={score >= 85 ? 'fill-emerald-400' : score >= 70 ? 'fill-amber-400' : 'fill-red-400'}
              style={{ fill: score >= 85 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171' }}
            >{score}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CapabilityProfilePanel() {
  const { toast } = useToast();
  const {
    dimensions, overallScore, profileVersion, lastSavedAt, notes,
    setSelfReported, setSubScore, saveProfile, recomputeInferred,
  } = useCapabilityProfileStore();

  const [isEditing, setIsEditing]   = useState(false);
  const [draftNotes, setDraftNotes] = useState(notes);
  const [recomputing, setRecomputing] = useState(false);

  const handleSave = useCallback(() => {
    saveProfile('Admin', draftNotes);
    setIsEditing(false);
    toast.success(`Capability profile saved — v${profileVersion + 1} · Composite: ${overallScore}/100`);
  }, [draftNotes, saveProfile, profileVersion, overallScore, toast]);

  const handleRecompute = useCallback(async () => {
    setRecomputing(true);
    await new Promise(r => setTimeout(r, 1400));
    recomputeInferred();
    setRecomputing(false);
    toast.success('Platform-inferred scores refreshed from Ligature activity');
  }, [recomputeInferred, toast]);

  const scoreColor = overallScore >= 85 ? 'text-emerald-400' : overallScore >= 70 ? 'text-amber-400' : 'text-red-400';
  const DIM_ORDER: CapabilityDimensionId[] = ['regulatory', 'chemistry', 'biology', 'clinical', 'manufacturing'];

  return (
    <div className="space-y-6">

      {/* Header banner */}
      <div className="flex items-start gap-4 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
        <BarChart3 className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-violet-400 mb-0.5">Organizational Capability Profile</div>
          <div className="text-xs text-text-muted leading-relaxed">
            Self-reported + platform-inferred capability scoring across 5 dimensions. Composite scores feed directly into the <span className="text-text-secondary font-medium">internalCapability</span> dimension of every Candidate Targeting run. Profile v{profileVersion} · Last saved {new Date(lastSavedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{overallScore}</div>
          <div className="text-[10px] text-text-muted">Overall / 100</div>
        </div>
      </div>

      {/* Candidate Targeting feed notice */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <span className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-emerald-400">Live feed active.</span> Current composite score <span className="font-bold text-text-primary">{overallScore}/100</span> is applied to the internalCapability dimension of all Candidate Targeting rankings. Saving a new profile version takes effect on the next targeting run.
        </span>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        {!isEditing ? (
          <Button variant="secondary" size="sm" onClick={() => { setIsEditing(true); setDraftNotes(notes); }}>
            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
          </Button>
        ) : (
          <>
            <Button variant="primary" size="sm" onClick={handleSave}>
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Profile
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </Button>
          </>
        )}
        <Button variant="secondary" size="sm" onClick={handleRecompute} disabled={recomputing}>
          {recomputing
            ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Refreshing…</>
            : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Inferred</>
          }
        </Button>
      </div>

      {/* Radar + legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface-card p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-3">Capability Radar</div>
          <CapabilityRadar dims={dimensions} />
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />≥85 Strong</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />70–84 Good</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />&lt;70 Gap</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-card p-4 space-y-3">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Score Summary</div>
          {DIM_ORDER.map(id => {
            const dim = dimensions[id];
            const meta = DIM_META[id];
            const barColor = dim.composite >= 85 ? 'bg-emerald-500' : dim.composite >= 70 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={id}>
                <div className="flex items-center justify-between mb-1">
                  <div className={`flex items-center gap-1.5 text-[11px] ${meta.accentText}`}>
                    {meta.icon} <span>{dim.label.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-text-muted">Self {dim.selfReported}</span>
                    <DeltaIndicator self={dim.selfReported} inferred={dim.platformInferred} />
                    <span className="text-text-muted">Inf {dim.platformInferred}</span>
                    <span className={`font-bold ${dim.composite >= 85 ? 'text-emerald-400' : dim.composite >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{dim.composite}</span>
                  </div>
                </div>
                <ScoreBar value={dim.composite} color={barColor} />
              </div>
            );
          })}

          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-muted font-semibold">Weighted overall</span>
              <span className={`text-sm font-bold ${scoreColor}`}>{overallScore} / 100</span>
            </div>
            <div className="text-[10px] text-text-muted/60 mt-0.5">Regulatory 25% · Chemistry 22% · Biology 20% · Clinical 18% · Manufacturing 15%</div>
          </div>
        </div>
      </div>

      {/* Source legend */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface-elevated border border-border">
        <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
        <div className="text-[10px] text-text-muted leading-relaxed">
          <span className="font-semibold text-violet-400">Self-reported</span> scores are admin-editable above. <span className="font-semibold text-emerald-400">Platform-inferred</span> scores are computed from Ligature module activity (module records, document counts, agent runs, compliance history). Composite = 60% self-reported + 40% inferred.
        </div>
      </div>

      {/* Dimension cards */}
      <div className="space-y-3">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Dimension Detail</div>
        {DIM_ORDER.map(id => (
          <DimensionCard
            key={id}
            dim={dimensions[id]}
            isEditing={isEditing}
            onSelfChange={setSelfReported}
            onSubChange={setSubScore}
          />
        ))}
      </div>

      {/* Admin notes */}
      <div className="rounded-xl border border-border bg-surface-card p-4">
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Admin Notes</div>
        {isEditing ? (
          <textarea
            value={draftNotes}
            onChange={e => setDraftNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
            placeholder="Context, caveats, assumptions behind the self-reported scores…"
          />
        ) : (
          <p className="text-xs text-text-secondary leading-relaxed">{notes}</p>
        )}
      </div>

      {/* Warning if any dim < 60 */}
      {DIM_ORDER.some(id => dimensions[id].composite < 60) && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-text-secondary leading-relaxed">
            One or more dimensions score below 60. Candidate Targeting will flag these as capability gaps and recommend partnership or CRO coverage in the Ligature Advantage section.
          </span>
        </div>
      )}
    </div>
  );
}
