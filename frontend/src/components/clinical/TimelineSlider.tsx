
import { useState, useMemo } from 'react';
import { Calendar, CheckCircle2, Clock, AlertTriangle, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { StudyMilestone } from '@/store/studyStartupTypes';

// =============================================================================
// STUDY MILESTONE TIMELINE
// Replaces the scrubber-style widget with a Gantt-like milestone track
// that shows named milestones, planned vs actual dates, and variances
// =============================================================================

interface TimelineSliderProps {
  startDate: string;
  endDate: string;
  currentDate: string;
  todayDate: string;
  milestones: StudyMilestone[];
  mode: 'historical' | 'projected';
  onDateChange: (date: string) => void;
  onModeChange: (mode: 'historical' | 'projected') => void;
  onResetToToday: () => void;
  className?: string;
}

function fmt(date: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtShort(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function progressPct(start: string, end: string, today: string): number {
  const total = daysBetween(start, end);
  const elapsed = daysBetween(start, today);
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function positionPct(start: string, end: string, date: string): number {
  const total = daysBetween(start, end);
  const offset = daysBetween(start, date);
  return Math.max(0, Math.min(100, (offset / total) * 100));
}

export function TimelineSlider({
  startDate,
  endDate,
  currentDate,
  todayDate,
  milestones,
  mode,
  onDateChange,
  onModeChange,
  onResetToToday,
  className = '',
}: TimelineSliderProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<StudyMilestone | null>(null);

  const todayPct = useMemo(() => positionPct(startDate, endDate, todayDate), [startDate, endDate, todayDate]);
  const progressPctVal = useMemo(() => progressPct(startDate, endDate, todayDate), [startDate, endDate, todayDate]);

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const overdueCount   = milestones.filter(m => m.status === 'overdue').length;
  const pendingCount   = milestones.filter(m => m.status === 'pending' || m.status === 'projected').length;

  // Step to prev/next milestone
  const stepMilestone = (direction: -1 | 1) => {
    const dates = milestones
      .map(m => m.actualDate || m.baselineDate)
      .sort();
    const cur = currentDate;
    if (direction === -1) {
      const prev = [...dates].reverse().find(d => d < cur);
      if (prev) onDateChange(prev);
    } else {
      const next = dates.find(d => d > cur);
      if (next) onDateChange(next);
    }
  };

  const getMilestoneStyle = (m: StudyMilestone) => {
    if (m.status === 'completed') return { ring: 'ring-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'bg-emerald-500/10 border-emerald-500/30' };
    if (m.status === 'overdue')   return { ring: 'ring-red-500',     bg: 'bg-red-500',     text: 'text-red-400',     label: 'bg-red-500/10 border-red-500/30' };
    if (m.status === 'pending')   return { ring: 'ring-amber-400',   bg: 'bg-amber-400',   text: 'text-amber-400',   label: 'bg-amber-400/10 border-amber-400/30' };
    return                               { ring: 'ring-slate-500',   bg: 'bg-slate-600',   text: 'text-slate-400',   label: 'bg-slate-500/10 border-slate-500/30' };
  };

  const getMilestoneIcon = (m: StudyMilestone) => {
    if (m.status === 'completed') return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (m.status === 'overdue')   return <AlertTriangle className="w-3 h-3 text-red-400" />;
    if (m.status === 'pending')   return <Clock className="w-3 h-3 text-amber-400" />;
    return <Circle className="w-3 h-3 text-slate-400" />;
  };

  const activeDate = mode === 'historical' ? todayDate : currentDate;

  return (
    <div className={`bg-surface-elevated border border-border rounded-xl overflow-hidden ${className}`}>
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-text-muted" />
          <span className="text-sm font-medium text-text-primary">Study Timeline</span>
          <span className="text-xs text-text-muted">
            {fmt(startDate, { month: 'short', year: 'numeric' })} – {fmt(endDate, { month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Milestone stepper */}
          <button
            onClick={() => stepMilestone(-1)}
            className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
            title="Previous milestone"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => stepMilestone(1)}
            className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
            title="Next milestone"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Mode toggle */}
          <div className="flex items-center bg-surface rounded-lg p-0.5 ml-1">
            <button
              onClick={() => onModeChange('historical')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                mode === 'historical'
                  ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Historical
            </button>
            <button
              onClick={() => onModeChange('projected')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                mode === 'projected'
                  ? 'bg-blue-500/20 text-blue-400 font-medium'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Projected
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
        <div className="px-4 py-2.5 text-center">
          <div className="text-base font-bold text-text-primary">{Math.round(progressPctVal)}%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Study Progress</div>
        </div>
        <div className="px-4 py-2.5 text-center">
          <div className="text-base font-bold text-emerald-400">{completedCount}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Completed</div>
        </div>
        <div className="px-4 py-2.5 text-center">
          <div className={`text-base font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-text-muted'}`}>{overdueCount}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Overdue</div>
        </div>
        <div className="px-4 py-2.5 text-center">
          <div className="text-base font-bold text-amber-400">{pendingCount}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Upcoming</div>
        </div>
      </div>

      {/* ── Visual timeline track ───────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-2 relative">
        {/* Track background */}
        <div className="relative h-2 bg-surface rounded-full">
          {/* Elapsed fill */}
          <div
            className="absolute h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full transition-all"
            style={{ width: `${progressPctVal}%` }}
          />
          {/* Projected fill */}
          {mode === 'projected' && (
            <div
              className="absolute h-full bg-gradient-to-r from-blue-600/40 to-blue-500/60 rounded-full"
              style={{ left: `${todayPct}%`, width: `${100 - todayPct}%` }}
            />
          )}

          {/* Today marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${todayPct}%` }}
          >
            <div className="w-3 h-3 rounded-full bg-white border-2 border-amber-400 shadow" />
          </div>

          {/* Milestone markers on track */}
          {milestones.map(m => {
            const pct = positionPct(startDate, endDate, m.actualDate || m.baselineDate);
            const style = getMilestoneStyle(m);
            return (
              <button
                key={m.code}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-surface ring-1 ${style?.ring ?? ''} ${style?.bg ?? ''} hover:scale-125 transition-transform z-10`}
                style={{ left: `${pct}%` }}
                onClick={() => setSelectedMilestone(s => s?.code === m.code ? null : m)}
                title={m.fullName}
              />
            );
          })}
        </div>

        {/* Today label */}
        <div
          className="absolute top-1 -translate-x-1/2 text-[9px] font-medium text-amber-400 whitespace-nowrap"
          style={{ left: `calc(${todayPct}% + 1.5rem)` }}
        >
          Today · {fmt(todayDate, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>

        {/* Date endpoints */}
        <div className="flex justify-between mt-2 text-[10px] text-text-muted">
          <span>{fmtShort(startDate)}</span>
          <span>{fmtShort(endDate)}</span>
        </div>
      </div>

      {/* ── Milestone legend row ────────────────────────────────────────── */}
      <div className="px-4 pb-3 flex items-start gap-2 flex-wrap">
        {milestones.map(m => {
          const style = getMilestoneStyle(m);
          const isSelected = selectedMilestone?.code === m.code;
          const displayDate = mode === 'projected'
            ? (m.actualDate || m.baselineDate)
            : (m.actualDate || m.baselineDate);
          const variance = m.actualDate
            ? daysBetween(m.baselineDate, m.actualDate)
            : null;

          return (
            <button
              key={m.code}
              onClick={() => setSelectedMilestone(s => s?.code === m.code ? null : m)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs transition-all ${style?.label ?? ''} ${
                isSelected ? 'ring-1 ring-current scale-105' : 'hover:scale-105'
              }`}
            >
              {getMilestoneIcon(m)}
              <span className={`font-medium ${style?.text ?? ''}`}>{m.code}</span>
              <span className="text-text-muted">{fmtShort(displayDate)}</span>
              {variance !== null && variance !== 0 && (
                <span className={`font-mono ${variance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {variance > 0 ? `+${variance}d` : `${variance}d`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Selected milestone detail panel ────────────────────────────── */}
      {selectedMilestone && (() => {
        const m = selectedMilestone;
        const style = getMilestoneStyle(m);
        const variance = m.actualDate ? daysBetween(m.baselineDate, m.actualDate) : null;
        return (
          <div className={`mx-4 mb-3 p-3 rounded-lg border ${style?.label ?? ''} text-xs`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getMilestoneIcon(m)}
                <span className={`font-semibold ${style?.text ?? ''}`}>{m.code}</span>
                <span className="text-text-primary font-medium">{m.fullName}</span>
              </div>
              <button onClick={() => setSelectedMilestone(null)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-text-muted mb-0.5">Baseline</div>
                <div className="text-text-primary font-medium">{fmt(m.baselineDate)}</div>
              </div>
              <div>
                <div className="text-text-muted mb-0.5">{m.actualDate ? 'Actual' : 'Forecast'}</div>
                <div className={`font-medium ${m.actualDate ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {fmt(m.actualDate || m.baselineDate)}
                </div>
              </div>
              <div>
                <div className="text-text-muted mb-0.5">Variance</div>
                <div className={`font-medium font-mono ${
                  variance === null ? 'text-text-muted' :
                  variance === 0 ? 'text-emerald-400' :
                  variance > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {variance === null ? 'TBD' : variance === 0 ? 'On time' : `${variance > 0 ? '+' : ''}${variance} days`}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// =============================================================================
// MILESTONE TIMELINE ROW (used in Progress + Milestones grid)
// =============================================================================

interface MilestoneTimelineRowProps {
  milestones: StudyMilestone[];
  className?: string;
}

export function MilestoneTimelineRow({ milestones, className = '' }: MilestoneTimelineRowProps) {
  const fmt = (date: string | null) =>
    date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  const statusColor: Record<string, string> = {
    completed: 'text-emerald-400',
    overdue:   'text-red-400',
    pending:   'text-amber-400',
    projected: 'text-slate-400',
  };
  const statusBg: Record<string, string> = {
    completed: 'bg-emerald-500',
    overdue:   'bg-red-500',
    pending:   'bg-amber-400',
    projected: 'bg-slate-600',
  };

  return (
    <div className={`bg-surface-card border border-border rounded-lg p-4 h-full ${className}`}>
      <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Key Milestones</div>
      <div className="space-y-2">
        {milestones.map(m => {
          const showDate = m.actualDate || m.baselineDate;
          const variance = m.actualDate ? Math.round((new Date(m.actualDate).getTime() - new Date(m.baselineDate).getTime()) / 86_400_000) : null;
          return (
            <div key={m.code} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusBg[m.status]}`} />
              <span className="text-xs text-text-muted w-10 flex-shrink-0 font-mono">{m.code}</span>
              <span className="text-xs text-text-secondary flex-1 truncate">{m.fullName}</span>
              <span className={`text-xs font-medium flex-shrink-0 ${statusColor[m.status]}`}>{fmt(showDate)}</span>
              {variance !== null && variance !== 0 && (
                <span className={`text-[10px] font-mono flex-shrink-0 ${variance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {variance > 0 ? `+${variance}d` : `${variance}d`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TimelineSlider;
