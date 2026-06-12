// ============================================================================
// GlobalSubmissionPlanScreen — v0.62.0
// LIG-002 COMPLETE · LIG-007 COMPLETE · LIG-008 COMPLETE
// LIG-003 COMPLETE (Add Submission post-provisioning)
// LIG-004 COMPLETE (Provisioning Error Notification)
// LIG-005 COMPLETE (Template Type Picker — in wizard)
// ============================================================================


import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Globe, Crown, MapPin, Calendar, CheckCircle2, Clock,
  ChevronDown, ChevronRight, Search,
  FileText, Layers, User, PauseCircle, XCircle, Plus,
  Milestone, AlertCircle, GitBranch, EyeOff,
  AlertTriangle, Lock, Unlock, Edit3, ChevronUp,
  Camera, Printer, TrendingUp,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { useGlobalPlanStore } from '@/stores/global-plan-store';
import { useToast } from '@/components/ui/Toast';
import {
  GlobalSubmissionPlan, GSPTask, TaskStatus, TaskSection,
  GSPSubmission,
} from '@/data/global-submission-plan-data';
import { CPIDetailPanel } from '@/components/submissions/CPIDetailPanel';
import { AddSubmissionModal } from '@/components/submissions/AddSubmissionModal';
import { ProvisioningErrorBanner } from '@/components/submissions/ProvisioningErrorBanner';
import { TriggerMilestoneBanner } from '@/components/submissions/TriggerMilestoneBanner';
import { CriticalPathPanel } from '@/components/submissions/CriticalPathPanel';
import { GanttPanel } from '@/components/submissions/GanttPanel';
import { BaselineModal } from '@/components/submissions/BaselineModal';
import { PlanExportPanel } from '@/components/submissions/PlanExportPanel';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const STATUS_CONFIG: Record<TaskStatus, {
  label: string; icon: React.ElementType; color: string; bg: string; dot: string;
}> = {
  'complete':     { label: 'Complete',     icon: CheckCircle2,   color: 'text-emerald-400', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
  'in-progress':  { label: 'In Progress',  icon: Clock,          color: 'text-blue-400',    bg: 'bg-blue-500/15',    dot: 'bg-blue-400' },
  'not-started':  { label: 'Not Started',  icon: Milestone,      color: 'text-text-muted',  bg: 'bg-surface',        dot: 'bg-slate-500' },
  'on-hold':      { label: 'On Hold',      icon: PauseCircle,    color: 'text-amber-400',   bg: 'bg-amber-500/15',   dot: 'bg-amber-400' },
  'inactive':     { label: 'Inactive',     icon: XCircle,        color: 'text-text-muted',  bg: 'bg-surface',        dot: 'bg-slate-600' },
};

const SECTION_CONFIG: Record<TaskSection, { label: string; color: string; bg: string }> = {
  M1: { label: 'M1 – Administrative', color: 'text-violet-400', bg: 'bg-violet-500/15' },
  M2: { label: 'M2 – Summaries',      color: 'text-cyan-400',   bg: 'bg-cyan-500/15' },
  M3: { label: 'M3 – Quality',        color: 'text-amber-400',  bg: 'bg-amber-500/15' },
  M4: { label: 'M4 – Nonclinical',    color: 'text-pink-400',   bg: 'bg-pink-500/15' },
  M5: { label: 'M5 – Clinical',       color: 'text-emerald-400',bg: 'bg-emerald-500/15' },
};

const MARKET_FLAGS: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', Japan: '🇯🇵', China: '🇨🇳',
  Canada: '🇨🇦', UK: '🇬🇧', Australia: '🇦🇺',
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// LIG-011: Build successors map from predecessor links
function buildSuccessorMap(tasks: GSPTask[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of tasks) {
    for (const predId of (t.predecessorIds ?? [])) {
      if (!map[predId]) map[predId] = [];
      map[predId].push(t.id);
    }
  }
  return map;
}

// LIG-017: Days overdue for a task (>0 means delayed)
function getDaysOver(task: GSPTask): number {
  if (task.isHolidayRow || task.status === 'complete' || task.status === 'inactive' || !task.plannedFinishDate) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const finish = new Date(task.plannedFinishDate); finish.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((today.getTime() - finish.getTime()) / (1000 * 60 * 60 * 24)));
}

// ============================================================================
// PLAN SUMMARY HEADER
// ============================================================================

function PlanSummaryHeader({ plan }: { plan: GlobalSubmissionPlan }) {
  // LIG-019: Exclude holiday rows from all progress calculations
  const workTasks = plan.tasks.filter(t => !t.isHolidayRow);
  const totalTasks = workTasks.length;
  const completeTasks = workTasks.filter(t => t.status === 'complete').length;
  const inProgressTasks = workTasks.filter(t => t.status === 'in-progress').length;
  const criticalTasks = workTasks.filter(t => t.isCriticalPath && t.status !== 'complete').length;
  // LIG-017: Delayed tasks
  const delayedTasks = workTasks.filter(t => getDaysOver(t) > 0);
  const delayedCount = delayedTasks.length;
  const maxDaysOver = delayedCount > 0 ? Math.max(...delayedTasks.map(t => getDaysOver(t))) : 0;
  const progress = totalTasks > 0 ? Math.round((completeTasks / totalTasks) * 100) : 0;
  // LIG-009: Check if any M3 rows have pending CCP review
  const ccpReviewPending = plan.tasks.some(t => t.ccpReviewPending);

  return (
    <div className="bg-surface-card border border-border rounded-lg p-5 mb-4">
      {/* Plan identity */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide ${
              plan.planType === 'GSP'
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'bg-violet-500/20 text-violet-400'
            }`}>
              {plan.planType}
            </span>
            <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
              {plan.templateType ?? 'Standard'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              plan.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-text-muted/10 text-text-muted'
            }`}>
              {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-text-primary">{plan.name}</h2>
          <p className="text-sm text-text-muted">{plan.compound} · {plan.indication}</p>
        </div>

        {/* Submission badges */}
        <div className="flex flex-wrap gap-2 justify-end">
          {plan.submissions.map(sub => (
            <SubmissionBadge key={sub.id} submission={sub} compact />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface rounded-lg p-3 border border-border">
          <p className="text-xs text-text-muted mb-1">Overall Progress</p>
          <p className="text-xl font-semibold text-text-primary">{progress}%</p>
          <div className="mt-1.5 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 70 ? 'bg-emerald-500' : progress >= 40 ? 'bg-blue-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border">
          <p className="text-xs text-text-muted mb-1">Complete</p>
          <p className="text-xl font-semibold text-emerald-400">{completeTasks}</p>
          <p className="text-xs text-text-muted">of {totalTasks} tasks</p>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border">
          <p className="text-xs text-text-muted mb-1">In Progress</p>
          <p className="text-xl font-semibold text-blue-400">{inProgressTasks}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 border border-border">
          <p className="text-xs text-text-muted mb-1">Critical Path</p>
          <p className="text-xl font-semibold text-amber-400">{criticalTasks}</p>
          <p className="text-xs text-text-muted">open items</p>
        </div>
        {/* LIG-017: Delayed tasks stat */}
        <div className={`bg-surface rounded-lg p-3 border ${delayedCount > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-border'}`}>
          <p className="text-xs text-text-muted mb-1">Delayed</p>
          <p className={`text-xl font-semibold ${delayedCount > 0 ? 'text-red-400' : 'text-text-muted'}`}>{delayedCount}</p>
          {delayedCount > 0 && (
            <p className="text-xs text-red-400/70">max {maxDaysOver}d over</p>
          )}
          {delayedCount === 0 && (
            <p className="text-xs text-text-muted">none</p>
          )}
        </div>
        {plan.planType === 'GSP' && (
          <div className="bg-surface rounded-lg p-3 border border-border">
            <p className="text-xs text-text-muted mb-1">Lead Market</p>
            <p className="text-sm font-semibold text-text-primary flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              {MARKET_FLAGS[plan.leadMarket] ?? ''} {plan.leadMarket}
            </p>
            <p className="text-xs text-text-muted">{plan.satelliteMarkets.length} satellites</p>
          </div>
        )}
      </div>
      {/* LIG-009: CCP Review Pending alert */}
      {ccpReviewPending && (
        <div className="mt-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            <span className="font-medium">CCP Reference Review Required —</span>{' '}
            One or more M3 rows reference a submission classification that has changed. Review and confirm CCP links before submission.
          </p>
        </div>
      )}
    </div>
  );
}

function SubmissionBadge({ submission, compact }: { submission: GSPSubmission; compact?: boolean }) {
  const days = getDaysUntil(submission.targetDate);

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
      submission.isLead
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-border bg-surface'
    }`}>
      <span className="text-base leading-none">{submission.flag}</span>
      <div>
        <div className="flex items-center gap-1.5">
          {submission.isLead && <Crown className="w-3 h-3 text-amber-400" />}
          <span className="text-xs font-semibold text-text-primary">{submission.type}</span>
          <span className="text-xs text-text-muted">{submission.agency}</span>
        </div>
        {!compact && (
          <p className="text-xs text-text-muted mt-0.5">
            Target: {formatShortDate(submission.targetDate)}
            {days != null && days > 0 && (
              <span className={days < 90 ? 'text-amber-400' : 'text-text-muted'}> · {days}d</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TASK ROW
// ============================================================================

function TaskRow({
  task,
  plan,
  onStatusChange,
  onToggleInactive,
  onUpdateDates,
  onToggleLock,
  successorIds,
  showCPI,
  isHighlighted,
  rowRef,
}: {
  task: GSPTask;
  plan: GlobalSubmissionPlan;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onToggleInactive: (taskId: string) => void;
  onUpdateDates: (taskId: string, start?: string, finish?: string) => void;
  onToggleLock: (taskId: string) => void;
  successorIds: string[];
  showCPI: boolean;
  isHighlighted?: boolean;
  rowRef?: (el: HTMLTableRowElement | null) => void;
}) {
    const { deadClick } = useDeadClick();
  const [expanded, setExpanded] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [draftStart, setDraftStart] = useState(task.plannedStartDate ?? '');
  const [draftFinish, setDraftFinish] = useState(task.plannedFinishDate ?? '');
  const isInactive = task.status === 'inactive';
  const isHoliday = task.isHolidayRow;
  const daysOver = getDaysOver(task); // LIG-017

  // LIG-019: Holiday rows get special locked rendering
  if (isHoliday) {
    const holidayTypeColor = task.holidayType === 'agency-closure'
      ? 'bg-violet-500/8 border-violet-500/20 text-violet-300'
      : 'bg-slate-500/10 border-slate-500/20 text-slate-400';

    return (
      <>
        <tr
          ref={rowRef}
          className={`border-b border-border/30 ${isHighlighted ? 'ring-1 ring-inset ring-cyan-500/40' : ''}`}
          onClick={() => setExpanded(!expanded)}
          style={{ cursor: 'default' }}
        >
          <td className="w-10 pl-4 py-2 text-xs text-text-muted text-center opacity-50">{task.rowNum}</td>
          <td className="py-2 pr-3" colSpan={showCPI ? 7 : 6}>
            <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md border ${holidayTypeColor}`}>
              <span className="text-sm">{task.taskName.split(' ')[0]}</span>
              <span className="text-xs font-medium">{task.taskName.replace(/^[^ ]+ /, '')}</span>
              {task.plannedStartDate && task.plannedFinishDate && task.plannedStartDate !== task.plannedFinishDate && (
                <span className="text-[10px] opacity-70 ml-auto">{formatShortDate(task.plannedStartDate)} – {formatShortDate(task.plannedFinishDate)}</span>
              )}
              {task.plannedStartDate && task.plannedStartDate === task.plannedFinishDate && (
                <span className="text-[10px] opacity-70 ml-auto">{formatShortDate(task.plannedStartDate)}</span>
              )}
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-current opacity-60 font-medium uppercase tracking-wide">Locked</span>
              {task.holidayMarket && (
                <span className="text-[10px] opacity-60">{MARKET_FLAGS[task.holidayMarket] ?? ''} {task.holidayMarket}</span>
              )}
            </div>
          </td>
          <td className="py-2 pr-4 w-32">
            {task.plannedFinishDate && (
              <span className="text-xs text-text-muted">{formatShortDate(task.plannedFinishDate)}</span>
            )}
          </td>
        </tr>
        {expanded && task.notes && (
          <tr className="bg-surface-card/20 border-b border-border/30">
            <td />
            <td colSpan={showCPI ? 8 : 7} className="py-2 pr-4 text-xs text-text-muted italic">{task.notes}</td>
          </tr>
        )}
      </>
    );
  }

  const statusCfg = STATUS_CONFIG[task.status];
  const StatusIcon = statusCfg.icon;
  const sectionCfg = SECTION_CONFIG[task.moduleSection];

  return (
    <>
      <tr
        ref={rowRef}
        className={`group border-b border-border/50 hover:bg-surface-card/50 transition-all cursor-pointer ${
          isInactive ? 'opacity-40' : ''
        } ${task.isCriticalPath ? 'border-l-2 border-l-amber-500/60' : ''} ${
          isHighlighted ? 'bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/40' : ''
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Row num */}
        <td className="w-10 pl-4 py-2.5 text-xs text-text-muted text-center">
          {task.rowNum}
        </td>

        {/* Task name */}
        <td className="py-2.5 pr-3 min-w-[220px]">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex-shrink-0">
              {expanded
                ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                : <ChevronRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100" />
              }
            </div>
            <div>
              <p className={`text-sm font-medium ${
                isInactive ? 'line-through text-text-muted' : 'text-text-primary'
              }`}>
                {task.taskName}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${sectionCfg?.bg ?? ''} ${sectionCfg?.color ?? ''}`}>
                  {task.ctdSection}
                </span>
                <span className="text-[10px] text-text-muted">{task.phase}</span>
                {task.isCriticalPath && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                    ⚡ Critical
                  </span>
                )}
                {/* LIG-009: CCP badge on M3 rows */}
                {task.isCCPReferenced && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-medium border border-teal-500/20">
                    ⬡ CCP
                  </span>
                )}
                {task.ccpReviewPending && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">
                    ⚠ Review CCP
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="py-2.5 pr-3 w-32">
          <button
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${statusCfg?.bg ?? ''} ${statusCfg?.color ?? ''} hover:opacity-80`}
            onClick={(e) => {
              e.stopPropagation();
              const statuses: TaskStatus[] = ['not-started', 'in-progress', 'complete', 'on-hold'];
              const idx = statuses.indexOf(task.status);
              onStatusChange(task.id, statuses[(idx + 1) % statuses.length]);
            }}
          >
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </button>
        </td>

        {/* LIG-007: Submission(s) column */}
        <td className="py-2.5 pr-3 w-44">
          <div className="flex flex-wrap gap-1">
            {task.submissionIds.map(subId => {
              const sub = plan.submissions.find(s => s.id === subId);
              if (!sub) return null;
              return (
                <span
                  key={subId}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    sub.isLead
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-border bg-surface text-text-muted'
                  }`}
                >
                  {sub.flag} {sub.type}
                  {sub.isLead && ' ★'}
                </span>
              );
            })}
          </div>
        </td>

        {/* LIG-007: Country/Market column */}
        <td className="py-2.5 pr-3 w-40">
          <div className="flex flex-wrap gap-1">
            {task.markets.map(market => (
              <span
                key={market}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  market === plan.leadMarket
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-surface text-text-muted border border-border'
                }`}
              >
                {MARKET_FLAGS[market] ?? ''} {market}
              </span>
            ))}
          </div>
        </td>

        {/* LIG-007: Lead Market flag */}
        <td className="py-2.5 pr-3 w-20 text-center">
          {task.isLeadMarketTask
            ? <Crown className="w-3.5 h-3.5 text-amber-400 mx-auto" />
            : <span className="text-[10px] text-text-muted">Satellite</span>
          }
        </td>

        {/* LIG-008: CPI Reference (shown when toggle on) */}
        {showCPI && (
          <td className="py-2.5 pr-3 w-36">
            {task.cpiReference ? (
              <div className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span className="text-[11px] text-cyan-400 font-mono">{task.cpiReference}</span>
                {task.cpiSharedMarkets && task.cpiSharedMarkets.length > 1 && (
                  <span className="text-[9px] text-text-muted">
                    {task.cpiSharedMarkets.map(m => MARKET_FLAGS[m] ?? m).join(' ')}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-text-muted">—</span>
            )}
          </td>
        )}

        {/* Owner */}
        <td className="py-2.5 pr-3 w-36">
          {task.owner
            ? <span className="text-xs text-text-secondary flex items-center gap-1">
                <User className="w-3 h-3 text-text-muted" />
                {task.owner.split(' ').map((p, i) => i === 0 ? p[0] + '.' : p).join(' ')}
              </span>
            : <span className="text-xs text-text-muted">—</span>
          }
        </td>

        {/* Planned finish — LIG-017 delay badge */}
        <td className="py-2.5 pr-4 w-32">
          {task.plannedFinishDate ? (
            <div className="flex items-center gap-1.5">
              <div>
                <span className={`text-xs ${daysOver > 0 ? 'text-red-400 font-medium' : 'text-text-secondary'}`}>
                  {formatShortDate(task.plannedFinishDate)}
                </span>
                {daysOver > 0 && (
                  <p className="text-[10px] text-red-400 font-semibold flex items-center gap-0.5 mt-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {daysOver}d overdue
                  </p>
                )}
                {task.status !== 'complete' && daysOver === 0 && task.plannedFinishDate && (() => {
                  const days = getDaysUntil(task.plannedFinishDate);
                  if (days == null) return null;
                  if (days <= 14 && days >= 0) return (
                    <p className="text-[10px] text-amber-400">{days}d left</p>
                  );
                  return null;
                })()}
              </div>
              {/* LIG-018: lock icon */}
              {task.isDateLocked && (
                <Lock className="w-3 h-3 text-violet-400 flex-shrink-0" />
              )}
            </div>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </td>

        {/* LIG-013: Deviation vs baseline */}
        {plan?.baselineCapturedAt && (
          <td className="py-2.5 pr-4 w-28">
            {(() => {
              if (!task.baselineFinishDate || !task.plannedFinishDate || task.isHolidayRow) return <span className="text-xs text-text-muted">—</span>;
              const bDate = new Date(task.baselineFinishDate);
              const cDate = new Date(task.plannedFinishDate);
              const diffDays = Math.round((cDate.getTime() - bDate.getTime()) / 86400000);
              if (diffDays === 0) return <span className="text-xs text-emerald-400 font-medium">On track</span>;
              if (diffDays > 0) return <span className="text-xs text-red-400 font-medium">+{diffDays}d</span>;
              return <span className="text-xs text-emerald-400 font-medium">{diffDays}d</span>;
            })()}
          </td>
        )}
      </tr>

      {/* Expanded row detail */}
      {expanded && (
        <tr className="bg-surface-card/30 border-b border-border/50">
          <td />
          <td colSpan={showCPI ? 8 : 7} className="py-3 pr-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">

              {/* LIG-018: Inline date edit block */}
              <div className="col-span-2 sm:col-span-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-text-muted font-medium">Dates</p>
                  {!editingDates && !isInactive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDraftStart(task.plannedStartDate ?? '');
                        setDraftFinish(task.plannedFinishDate ?? '');
                        setEditingDates(true);
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-surface-elevated border border-border text-text-muted hover:text-text-primary hover:border-accent-blue/50 transition-colors"
                    >
                      <Edit3 className="w-2.5 h-2.5" />Edit dates
                    </button>
                  )}
                  {/* Lock toggle */}
                  {!isInactive && !editingDates && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleLock(task.id); }}
                      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        task.isDateLocked
                          ? 'border-violet-500/40 bg-violet-500/10 text-violet-400 hover:bg-violet-500/15'
                          : 'border-border bg-surface-elevated text-text-muted hover:text-violet-400 hover:border-violet-500/40'
                      }`}
                    >
                      {task.isDateLocked
                        ? <><Lock className="w-2.5 h-2.5" />Locked</>
                        : <><Unlock className="w-2.5 h-2.5" />Lock dates</>
                      }
                    </button>
                  )}
                </div>
                {editingDates ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <label className="block text-[10px] text-text-muted mb-1">Start</label>
                      <input
                        type="date"
                        value={draftStart}
                        onChange={e => setDraftStart(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent-blue text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted mb-1">Finish</label>
                      <input
                        type="date"
                        value={draftFinish}
                        onChange={e => setDraftFinish(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent-blue text-text-primary"
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateDates(task.id, draftStart || undefined, draftFinish || undefined);
                          setEditingDates(false);
                        }}
                        className="px-2.5 py-1 text-xs rounded bg-accent-blue text-white hover:bg-accent-blue/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingDates(false); }}
                        className="px-2.5 py-1 text-xs rounded bg-surface-elevated border border-border text-text-muted hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-text-secondary">
                    {task.plannedStartDate
                      ? <span>Start: <span className="font-medium">{formatDate(task.plannedStartDate)}</span></span>
                      : <span className="text-text-muted">No start date</span>
                    }
                    {task.plannedFinishDate
                      ? <span>Finish: <span className={`font-medium ${daysOver > 0 ? 'text-red-400' : ''}`}>{formatDate(task.plannedFinishDate)}</span></span>
                      : <span className="text-text-muted">No finish date</span>
                    }
                    {task.actualFinishDate && (
                      <span>Actual: <span className="font-medium text-emerald-400">{formatDate(task.actualFinishDate)}</span></span>
                    )}
                  </div>
                )}
              </div>

              {task.duration != null && (
                <div>
                  <p className="text-text-muted mb-0.5">Duration</p>
                  <p className="text-text-secondary">{task.duration} working days</p>
                </div>
              )}
              {task.owner && (
                <div>
                  <p className="text-text-muted mb-0.5">Owner</p>
                  <p className="text-text-secondary">{task.owner}</p>
                </div>
              )}

              {/* LIG-011: Predecessors */}
              {task.predecessorIds && task.predecessorIds.length > 0 && (
                <div>
                  <p className="text-text-muted mb-0.5">Predecessors</p>
                  <div className="flex flex-col gap-0.5">
                    {task.predecessorIds.map(predId => {
                      const pred = plan.tasks.find(t => t.id === predId);
                      return (
                        <span key={predId} className="text-[10px] text-text-muted font-mono">
                          {pred ? `${pred.rowNum}. ${pred.taskName.substring(0, 32)}${pred.taskName.length > 32 ? '…' : ''}` : predId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LIG-011: Successors (derived) */}
              {successorIds.length > 0 && (
                <div>
                  <p className="text-text-muted mb-0.5">Successors</p>
                  <div className="flex flex-col gap-0.5">
                    {successorIds.map(sucId => {
                      const suc = plan.tasks.find(t => t.id === sucId);
                      return (
                        <span key={sucId} className="text-[10px] text-cyan-400/80 font-mono">
                          {suc ? `${suc.rowNum}. ${suc.taskName.substring(0, 32)}${suc.taskName.length > 32 ? '…' : ''}` : sucId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {task.notes && (
                <div className="col-span-2 sm:col-span-4">
                  <p className="text-text-muted mb-0.5">Notes</p>
                  <p className="text-text-secondary italic">{task.notes}</p>
                </div>
              )}

              {/* LIG-017: Delay callout */}
              {daysOver > 0 && (
                <div className="col-span-2 sm:col-span-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-300">
                    <span className="font-semibold">{daysOver} day{daysOver !== 1 ? 's' : ''} overdue</span>
                    {' '}— planned finish was {formatDate(task.plannedFinishDate)}.
                    {task.isCriticalPath && ' This task is on the critical path.'}
                  </p>
                </div>
              )}

              {/* LIG-015: Date calculation indicators */}
              {(task.isDateCalculated || task.isDateOverridden || task.weekendAdjusted || task.isDateLocked) && (
                <div className="col-span-2 sm:col-span-4 flex flex-wrap gap-2">
                  {task.isDateCalculated && !task.isDateOverridden && !task.isDateLocked && (
                    <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      ⚡ Dates auto-calculated from trigger milestone
                    </span>
                  )}
                  {task.weekendAdjusted && (
                    <span className="text-[10px] px-2 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400">
                      📅 Adjusted from weekend/holiday
                    </span>
                  )}
                  {task.isDateOverridden && !task.isDateLocked && (
                    <span className="text-[10px] px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
                      ✎ Date manually overridden — excluded from recalculation
                    </span>
                  )}
                  {task.isDateLocked && (
                    <span className="text-[10px] px-2 py-1 rounded bg-violet-500/15 border border-violet-500/30 text-violet-300 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Date locked — will not be recalculated
                    </span>
                  )}
                </div>
              )}

              {/* LIG-010: Inactivation toggle */}
              <div className="col-span-2 sm:col-span-4 flex items-center gap-3 pt-1 border-t border-border/30 mt-1">
                {task.inactivatedAt && (
                  <span className="text-[10px] text-text-muted">
                    Inactivated by {task.inactivatedBy ?? 'User'} · {new Date(task.inactivatedAt).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleInactive(task.id); }}
                  className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    isInactive
                      ? 'border-emerald-500/40 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/15'
                      : 'border-slate-500/30 bg-slate-500/8 text-slate-400 hover:bg-slate-500/15'
                  }`}
                >
                  <EyeOff className="w-3 h-3" />
                  {isInactive ? 'Re-activate row' : 'Inactivate row'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// SECTION GROUP HEADER
// ============================================================================

function SectionGroupHeader({
  section,
  taskCount,
  completeCount,
  collapsed,
  onToggle,
}: {
  section: TaskSection;
  taskCount: number;
  completeCount: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const cfg = SECTION_CONFIG[section];
  const pct = taskCount > 0 ? Math.round((completeCount / taskCount) * 100) : 0;

  return (
    <tr
      className="bg-surface-card border-b border-border cursor-pointer hover:bg-surface-card/80"
      onClick={onToggle}
    >
      <td className="pl-4 py-2.5 w-10">
        {collapsed
          ? <ChevronRight className="w-4 h-4 text-text-muted" />
          : <ChevronDown className="w-4 h-4 text-text-muted" />
        }
      </td>
      <td colSpan={2} className="py-2.5 pr-3">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${cfg?.bg ?? ''} ${cfg?.color ?? ''}`}>
            {section}
          </span>
          <span className="text-sm font-semibold text-text-primary">{cfg.label}</span>
          <span className="text-xs text-text-muted">{completeCount}/{taskCount}</span>
        </div>
      </td>
      <td colSpan={6} className="py-2.5 pr-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden max-w-[160px]">
            <div
              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-text-muted">{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// PLAN SELECTOR
// ============================================================================

function PlanSelector({
  plans,
  activePlanId,
  onSelect,
}: {
  plans: GlobalSubmissionPlan[];
  activePlanId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {plans.map(plan => (
        <button
          key={plan.id}
          onClick={() => onSelect(plan.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
            activePlanId === plan.id
              ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
              : 'border-border bg-surface-card text-text-secondary hover:text-text-primary hover:border-border/80'
          }`}
        >
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            plan.planType === 'GSP'
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'bg-violet-500/20 text-violet-400'
          }`}>
            {plan.planType}
          </span>
          <span className="font-medium truncate max-w-[180px]">{plan.compound}</span>
          {plan.planType === 'GSP' && (
            <span className="text-[10px] text-text-muted">
              {MARKET_FLAGS[plan.leadMarket]} +{plan.satelliteMarkets.length}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export function GlobalSubmissionPlanScreen() {
  const { deadClick } = useDeadClick();
  const {
    plans, activePlanId, getActivePlan, setActivePlan,
    updateTaskStatus, toggleTaskInactive, overrideTaskDate, clearDateOverride, refreshCriticalPath,
    updateTaskDates, toggleDateLock,
  setBaseline, clearBaseline,
  } = useGlobalPlanStore();
  const plan = getActivePlan();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [showCPI, setShowCPI] = useState(false);
  const [showCPIPanel, setShowCPIPanel] = useState(false);        // LIG-008
  const [showAddSubmission, setShowAddSubmission] = useState(false); // LIG-003
  const [showCriticalPath, setShowCriticalPath] = useState(false);  // LIG-016
  const [showGantt, setShowGantt] = useState(false);               // LIG-012
  const [showBaseline, setShowBaseline] = useState(false);           // LIG-013
  const [showExport, setShowExport] = useState(false);               // LIG-014
  const [hideInactive, setHideInactive] = useState(false);          // LIG-010
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);  // LIG-016
  const [delayedOnly, setDelayedOnly] = useState(false);            // LIG-017
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const taskRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const toggleSection = useCallback((section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const handleStatusChange = useCallback((taskId: string, status: TaskStatus) => {
    if (plan) updateTaskStatus(plan.id, taskId, status);
  }, [plan, updateTaskStatus]);

  // LIG-010: Inactivation toggle
  const handleToggleInactive = useCallback((taskId: string) => {
    if (plan) {
      toggleTaskInactive(plan.id, taskId);
      refreshCriticalPath(plan.id);
    }
  }, [plan, toggleTaskInactive, refreshCriticalPath]);

  // LIG-018: Inline date update
  const handleUpdateDates = useCallback((taskId: string, start?: string, finish?: string) => {
    if (plan) updateTaskDates(plan.id, taskId, start, finish);
  }, [plan, updateTaskDates]);

  // LIG-018: Toggle date lock
  const handleToggleLock = useCallback((taskId: string) => {
    if (plan) toggleDateLock(plan.id, taskId);
  }, [plan, toggleDateLock]);

  // LIG-011: Successor map — derived from predecessorIds
  const successorMap = useMemo(() => plan ? buildSuccessorMap(plan.tasks) : {}, [plan]);

  // LIG-008: Jump to task row from CPI panel
  const handleJumpToTask = useCallback((taskId: string) => {
    setHighlightedTaskId(taskId);
    // Ensure section is expanded
    const task = plan?.tasks.find(t => t.id === taskId);
    if (task) {
      setCollapsedSections(prev => {
        const next = new Set(prev);
        next.delete(task.moduleSection);
        return next;
      });
    }
    setTimeout(() => {
      const el = taskRowRefs.current[taskId];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedTaskId(null), 2500);
    }, 100);
  }, [plan]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!plan) return [];
    return plan.tasks.filter(t => {
      // LIG-010: hide inactive rows when toggle is on (holiday rows always shown)
      if (hideInactive && !t.isHolidayRow && t.status === 'inactive') return false;
      // LIG-016: critical path only filter
      if (criticalPathOnly && !t.isHolidayRow && !t.isCriticalPath) return false;
      // LIG-017: delayed only filter
      if (delayedOnly && !t.isHolidayRow && getDaysOver(t) === 0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.taskName.toLowerCase().includes(q) && !t.ctdSection.toLowerCase().includes(q)) return false;
      }
      if (marketFilter !== 'all' && !t.markets.includes(marketFilter)) return false;
      if (statusFilter !== 'all' && !t.isHolidayRow && t.status !== statusFilter) return false;
      if (sectionFilter !== 'all' && t.moduleSection !== sectionFilter) return false;
      return true;
    });
  }, [plan, searchQuery, marketFilter, statusFilter, sectionFilter, hideInactive, criticalPathOnly]);

  // Group tasks by module section — holiday rows included for rendering but excluded from counts
  const tasksBySection = useMemo(() => {
    const sections: TaskSection[] = ['M1', 'M2', 'M3', 'M4', 'M5'];
    return sections.map(section => ({
      section,
      tasks: filteredTasks.filter(t => t.moduleSection === section),
      workTasks: filteredTasks.filter(t => t.moduleSection === section && !t.isHolidayRow),
    })).filter(g => g.tasks.length > 0);
  }, [filteredTasks]);

  // Market options for filter
  const marketOptions = useMemo(() => {
    if (!plan) return [];
    return [plan.leadMarket, ...plan.satelliteMarkets];
  }, [plan]);

  if (!plan) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted">
        <div className="text-center">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No plan selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        moduleId="submission-planning"
        title="Submission Planning"
        subtitle="Global and Local Submission Plans — provisioned task grids with per-market attribution"
        icon={<Globe className="w-5 h-5" />}
        actions={
          <CapabilityGate moduleId="submission-planning" capability="author" inline>
            <button className="px-3 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2" onClick={deadClick}>
              <Plus className="w-4 h-4" />New Plan
            </button>
          </CapabilityGate>
        }
      />

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">

        {/* Plan selector */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <PlanSelector plans={plans} activePlanId={activePlanId} onSelect={setActivePlan} />
          {/* LIG-003: Add Submission button (only for active GSP) */}
          {plan?.planType === 'GSP' && plan?.provisioningStatus === 'active' && (
            <CapabilityGate moduleId="submission-planning" capability="author" inline>
              <button
                onClick={() => setShowAddSubmission(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-blue/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />Add Submission
              </button>
            </CapabilityGate>
          )}
        </div>

        {/* LIG-004: Provisioning error banner */}
        {plan && <ProvisioningErrorBanner plan={plan} />}

        {/* Plan summary */}
        <PlanSummaryHeader plan={plan} />

        {/* LIG-015: UQ trigger milestone date calculator */}
        {plan && <TriggerMilestoneBanner plan={plan} />}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* Market filter — LIG-007 */}
          <select
            value={marketFilter}
            onChange={e => setMarketFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Markets</option>
            {marketOptions.map(m => (
              <option key={m} value={m}>{MARKET_FLAGS[m] ?? ''} {m}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Status</option>
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>

          {/* Module filter */}
          <select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Modules</option>
            {(['M1','M2','M3','M4','M5'] as TaskSection[]).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="flex-1" />

          {/* LIG-010: Hide inactive toggle */}
          <button
            onClick={() => setHideInactive(!hideInactive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              hideInactive
                ? 'border-slate-500/50 bg-slate-500/10 text-slate-300'
                : 'border-border bg-surface-card text-text-muted hover:text-text-primary'
            }`}
          >
            Hide Inactive
          </button>

          {/* LIG-016: Critical path only filter */}
          <button
            onClick={() => setCriticalPathOnly(!criticalPathOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              criticalPathOnly
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                : 'border-border bg-surface-card text-text-muted hover:text-text-primary'
            }`}
          >
            ⚡ Critical Only
          </button>

          {/* LIG-017: Delayed only filter */}
          <button
            onClick={() => setDelayedOnly(!delayedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              delayedOnly
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-border bg-surface-card text-text-muted hover:text-text-primary'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Delayed Only
          </button>

          {/* LIG-012: Gantt Chart */}
          <button
            onClick={() => setShowGantt(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-card text-text-muted hover:text-text-primary hover:border-blue-500/50 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            Gantt
          </button>

          {/* LIG-013: Baseline Snapshot */}
          <button
            onClick={() => setShowBaseline(true)}
            className={plan?.baselineCapturedAt
              ? 'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-violet-500/50 bg-violet-500/10 text-violet-400 transition-colors'
              : 'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-card text-text-muted hover:text-text-primary hover:border-violet-500/40 transition-colors'
            }
          >
            <Camera className="w-3.5 h-3.5" />
            {plan?.baselineCapturedAt ? 'Baseline ✓' : 'Set Baseline'}
          </button>

          {/* LIG-014: Export / Print */}
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-card text-text-muted hover:text-text-primary hover:border-green-500/40 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-green-400" />
            Export
          </button>

          {/* LIG-016: Dependency graph panel */}
          <button
            onClick={() => setShowCriticalPath(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-card text-text-muted hover:text-text-primary hover:border-amber-500/50 transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            Dep Graph
          </button>

          {/* CPI controls — LIG-008 COMPLETE */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCPI(!showCPI)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                showCPI
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                  : 'border-border bg-surface-card text-text-muted hover:text-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              CPI Column
            </button>
            {plan?.planType === 'GSP' && (
              <button
                onClick={() => setShowCPIPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface-card text-text-muted hover:text-text-primary hover:border-cyan-500/50 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                CPI Registry
              </button>
            )}
          </div>

          <span className="text-xs text-text-muted">{filteredTasks.filter(t => !t.isHolidayRow).length} tasks</span>
        </div>

        {/* Plan grid */}
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              {/* Column headers */}
              <thead>
                <tr className="bg-surface border-b-2 border-border text-xs text-text-muted">
                  <th className="pl-4 py-2.5 w-10 text-center">#</th>
                  <th className="py-2.5 pr-3 text-left min-w-[220px]">Task</th>
                  <th className="py-2.5 pr-3 text-left w-32">Status</th>
                  {/* LIG-007 columns */}
                  <th className="py-2.5 pr-3 text-left w-44">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />Submission(s)
                    </span>
                  </th>
                  <th className="py-2.5 pr-3 text-left w-40">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />Market
                    </span>
                  </th>
                  <th className="py-2.5 pr-3 text-center w-20">
                    <span className="flex items-center gap-1 justify-center">
                      <Crown className="w-3 h-3 text-amber-400" />Lead
                    </span>
                  </th>
                  {/* LIG-008: CPI */}
                  {showCPI && (
                    <th className="py-2.5 pr-3 text-left w-36">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" />CPI Ref
                      </span>
                    </th>
                  )}
                  <th className="py-2.5 pr-3 text-left w-36">Owner</th>
                  <th className="py-2.5 pr-4 text-left w-32">Target Finish</th>
                  {plan?.baselineCapturedAt && (
                    <th className="py-2.5 pr-4 text-left w-28">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-violet-400" />vs Baseline
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {tasksBySection.map(({ section, tasks, workTasks: sectionWork }) => {
                  const collapsed = collapsedSections.has(section);
                  const completeCount = sectionWork.filter(t => t.status === 'complete').length;
                  return (
                    <React.Fragment key={section}>
                      <SectionGroupHeader
                        section={section}
                        taskCount={sectionWork.length}
                        completeCount={completeCount}
                        collapsed={collapsed}
                        onToggle={() => toggleSection(section)}
                      />
                      {!collapsed && tasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          plan={plan}
                          onStatusChange={handleStatusChange}
                          onToggleInactive={handleToggleInactive}
                          onUpdateDates={handleUpdateDates}
                          onToggleLock={handleToggleLock}
                          successorIds={successorMap[task.id] ?? []}
                          showCPI={showCPI}
                          isHighlighted={highlightedTaskId === task.id}
                          rowRef={(el) => { taskRowRefs.current[task.id] = el; }}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={showCPI ? 9 : 8} className="py-12 text-center text-text-muted">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No tasks match current filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LIG-007 legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-1">
          <div className="flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Lead Market task (from lead template)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Satellite</span>
            <span>Market-specific delta task</span>
          </div>
          {showCPI && (
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>CPI shared across displayed markets</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1 rounded bg-amber-500/15 text-amber-400">⚡ Critical</span>
            <span>On critical path</span>
          </div>
          {/* LIG-009 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20">⬡ CCP</span>
            <span>Core Content Plan reference (M3 global rows)</span>
          </div>
          {/* LIG-019 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-500/20 bg-slate-500/10 text-slate-400">🏖 Holiday</span>
            <span>Locked — excluded from progress calculations</span>
          </div>
        </div>
      </div>

      {/* LIG-008: CPI Detail Panel */}
      {showCPIPanel && plan && (
        <CPIDetailPanel
          plan={plan}
          onClose={() => setShowCPIPanel(false)}
          onJumpToTask={handleJumpToTask}
        />
      )}

      {/* LIG-003: Add Submission Modal */}
      {showAddSubmission && plan && (
        <AddSubmissionModal
          plan={plan}
          onClose={() => setShowAddSubmission(false)}
          onSuccess={(note) => toast.success(note)}
        />
      )}

      {/* LIG-016: Critical Path / Dependency Graph */}
      {showCriticalPath && plan && (
        <CriticalPathPanel
          plan={plan}
          onClose={() => setShowCriticalPath(false)}
          onJumpToTask={handleJumpToTask}
        />
      )}

      {/* LIG-012: Gantt Chart */}
      {showGantt && plan && (
        <GanttPanel
          plan={plan}
          onClose={() => setShowGantt(false)}
        />
      )}

      {/* LIG-013: Baseline Snapshot Modal */}
      {showBaseline && plan && (
        <BaselineModal
          plan={plan}
          onConfirm={() => {
            const result = setBaseline(plan.id);
            toast.success(`Baseline captured — ${result.count} tasks frozen`);
            setShowBaseline(false);
          }}
          onClear={() => {
            clearBaseline(plan.id);
            toast.success('Baseline cleared');
            setShowBaseline(false);
          }}
          onClose={() => setShowBaseline(false)}
        />
      )}

      {/* LIG-014: Plan Export / Print View */}
      {showExport && plan && (
        <PlanExportPanel
          plan={plan}
          filteredTasks={filteredTasks}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

export default GlobalSubmissionPlanScreen;
