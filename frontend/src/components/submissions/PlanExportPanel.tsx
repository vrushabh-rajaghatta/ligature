// ============================================================================
// PlanExportPanel — v0.66.0 — LIG-014
// Print-optimised overlay for plan task grid
// Features:
//   · Full-screen overlay with plan summary header + task grid
//   · Respects current active filters (passed as props)
//   · Print button triggers window.print()
//   · Print-specific CSS hides all UI chrome except the grid
//   · Deviation column shown if baseline exists
// ============================================================================


import React, { useEffect } from 'react';
import { X, Printer, Calendar, Crown, CheckCircle2, Clock, AlertTriangle, Lock } from 'lucide-react';
import { GlobalSubmissionPlan, GSPTask, TaskStatus, TaskSection } from '@/data/global-submission-plan-data';

interface PlanExportPanelProps {
  plan: GlobalSubmissionPlan;
  filteredTasks: GSPTask[];
  onClose: () => void;
}

const STATUS_LABEL: Record<TaskStatus, { label: string; color: string }> = {
  'complete':    { label: 'Complete',    color: 'text-emerald-400' },
  'in-progress': { label: 'In Progress', color: 'text-blue-400'    },
  'not-started': { label: 'Not Started', color: 'text-slate-400'   },
  'on-hold':     { label: 'On Hold',     color: 'text-amber-400'   },
  'inactive':    { label: 'Inactive',    color: 'text-slate-500'   },
};

const SECTION_COLOR: Record<TaskSection, string> = {
  M1: 'text-violet-400', M2: 'text-cyan-400', M3: 'text-amber-400',
  M4: 'text-pink-400',   M5: 'text-emerald-400',
};

function formatDate(str?: string): string {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function deviationLabel(task: GSPTask): { label: string; color: string } | null {
  if (!task.baselineFinishDate || !task.plannedFinishDate) return null;
  const b = new Date(task.baselineFinishDate);
  const c = new Date(task.plannedFinishDate);
  const days = Math.round((c.getTime() - b.getTime()) / 86400000);
  if (days === 0) return { label: 'On track', color: 'text-emerald-400' };
  if (days > 0)   return { label: `+${days}d late`, color: 'text-red-400' };
  return { label: `${days}d early`, color: 'text-emerald-400' };
}

export function PlanExportPanel({ plan, filteredTasks, onClose }: PlanExportPanelProps) {
  const hasBaseline = !!plan.baselineCapturedAt;
  const workTasks = filteredTasks.filter(t => !t.isHolidayRow && t.status !== 'inactive');
  const complete  = workTasks.filter(t => t.status === 'complete').length;
  const progress  = workTasks.length > 0 ? Math.round(complete / workTasks.length * 100) : 0;
  const delayed   = workTasks.filter(t => {
    if (!t.plannedFinishDate || t.status === 'complete') return false;
    return new Date(t.plannedFinishDate) < new Date();
  }).length;

  // Inject print styles once
  useEffect(() => {
    const styleId = 'lig-print-styles';
    if (!document.getElementById(styleId)) {
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = `
        @media print {
          body > *:not(#lig-print-root) { display: none !important; }
          #lig-print-root { position: fixed !important; inset: 0 !important; background: white !important; color: black !important; }
          #lig-print-close-btn { display: none !important; }
          .print-table th, .print-table td { border: 1px solid #ccc !important; padding: 4px 8px !important; font-size: 10px !important; }
          .print-table th { background: #f1f5f9 !important; }
          .text-red-400 { color: #dc2626 !important; }
          .text-emerald-400 { color: #059669 !important; }
          .text-amber-400 { color: #d97706 !important; }
          .text-violet-400 { color: #7c3aed !important; }
          .text-cyan-400 { color: #0891b2 !important; }
          .text-pink-400 { color: #db2777 !important; }
          .text-blue-400 { color: #2563eb !important; }
          .text-slate-400 { color: #94a3b8 !important; }
          .text-slate-500 { color: #64748b !important; }
        }
      `;
      document.head.appendChild(el);
    }
  }, []);

  return (
    <div id="lig-print-root" className="fixed inset-0 z-50 bg-surface overflow-auto">
      {/* Toolbar (hidden on print) */}
      <div id="lig-print-close-btn" className="flex items-center gap-3 px-5 py-3 bg-surface-card border-b border-border sticky top-0 z-10">
        <Printer className="w-4 h-4 text-accent-blue" />
        <span className="font-semibold text-sm text-text-primary">Export / Print View</span>
        <span className="text-xs text-text-muted">— {filteredTasks.filter(t => !t.isHolidayRow).length} tasks shown (based on current filters)</span>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary ml-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Print content */}
      <div className="p-8 max-w-[1100px] mx-auto">

        {/* Plan header */}
        <div className="mb-6 pb-4 border-b-2 border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue">{plan.planType}</span>
                <span className="text-[10px] text-text-muted px-2 py-0.5 rounded border border-border bg-surface">{plan.templateType}</span>
              </div>
              <h1 className="text-xl font-bold text-text-primary">{plan.name}</h1>
              <p className="text-sm text-text-muted">{plan.compound} · {plan.indication}</p>
            </div>
            <div className="text-right text-xs text-text-muted">
              <p>Exported: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p>Plan status: <span className="font-medium text-text-secondary capitalize">{plan.status}</span></p>
              {hasBaseline && (
                <p>Baseline: {new Date(plan.baselineCapturedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} by {plan.baselineCapturedBy}</p>
              )}
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            {[
              { label: 'Progress', value: `${progress}%`, color: progress >= 70 ? 'text-emerald-400' : 'text-blue-400' },
              { label: 'Complete', value: `${complete}/${workTasks.length}`, color: 'text-emerald-400' },
              { label: 'In Progress', value: workTasks.filter(t => t.status === 'in-progress').length, color: 'text-blue-400' },
              { label: 'Critical Path', value: workTasks.filter(t => t.isCriticalPath && t.status !== 'complete').length, color: 'text-amber-400' },
              { label: 'Delayed', value: delayed, color: delayed > 0 ? 'text-red-400' : 'text-text-muted' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-2.5 rounded-lg bg-surface border border-border">
                <p className={`text-lg font-bold ${stat?.color ?? ''}`}>{stat.value}</p>
                <p className="text-[10px] text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Task grid */}
        <table className="w-full text-xs border-collapse print-table">
          <thead>
            <tr className="bg-surface border-b-2 border-border text-text-muted">
              <th className="text-left py-2 px-2 w-8">#</th>
              <th className="text-left py-2 px-2">Task</th>
              <th className="text-left py-2 px-2 w-24">CTD Section</th>
              <th className="text-left py-2 px-2 w-24">Status</th>
              <th className="text-left py-2 px-2 w-28">Owner</th>
              <th className="text-left py-2 px-2 w-28">Target Start</th>
              <th className="text-left py-2 px-2 w-28">Target Finish</th>
              {hasBaseline && <th className="text-left py-2 px-2 w-24">vs Baseline</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task, idx) => {
              if (task.isHolidayRow) {
                return (
                  <tr key={task.id} className="border-b border-border/30 bg-slate-500/5">
                    <td className="py-1 px-2 text-text-muted">{task.rowNum}</td>
                    <td colSpan={hasBaseline ? 7 : 6} className="py-1 px-2 text-text-muted italic text-[10px]">
                      🏖 {task.taskName} — Holiday (locked)
                    </td>
                  </tr>
                );
              }
              const statusCfg = STATUS_LABEL[task.status] ?? STATUS_LABEL['not-started'];
              const deviation = hasBaseline ? deviationLabel(task) : null;
              const isInactive = task.status === 'inactive';
              const isDelayed = !isInactive && task.status !== 'complete' && task.plannedFinishDate && new Date(task.plannedFinishDate) < new Date();

              return (
                <tr
                  key={task.id}
                  className={`border-b border-border/30 ${isInactive ? 'opacity-40' : ''} ${task.isCriticalPath ? 'border-l-2 border-l-amber-500/50' : ''}`}
                >
                  <td className="py-1.5 px-2 text-text-muted">{task.rowNum}</td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono ${SECTION_COLOR[task.moduleSection]}`}>{task.moduleSection}</span>
                      <span className={`font-medium text-text-primary ${isInactive ? 'line-through' : ''}`}>{task.taskName}</span>
                      {task.isCriticalPath && <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-400">⚡</span>}
                      {task.isDateLocked && <Lock className="w-2.5 h-2.5 text-violet-400" />}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 font-mono text-text-muted">{task.ctdSection}</td>
                  <td className={`py-1.5 px-2 ${statusCfg?.color ?? ''}`}>{statusCfg.label}</td>
                  <td className="py-1.5 px-2 text-text-secondary">{task.owner ?? '—'}</td>
                  <td className="py-1.5 px-2 text-text-secondary">{formatDate(task.plannedStartDate)}</td>
                  <td className={`py-1.5 px-2 ${isDelayed ? 'text-red-400 font-medium' : 'text-text-secondary'}`}>
                    {formatDate(task.plannedFinishDate)}
                    {isDelayed && <span className="text-[9px] ml-1">(overdue)</span>}
                  </td>
                  {hasBaseline && (
                    <td className={`py-1.5 px-2 ${deviation?.color ?? 'text-text-muted'}`}>
                      {deviation?.label ?? '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-border text-[10px] text-text-muted flex items-center justify-between">
          <span>Ligature v0.66 · {plan.name} · Generated {new Date().toLocaleString()}</span>
          <span>{filteredTasks.filter(t => !t.isHolidayRow).length} tasks</span>
        </div>
      </div>
    </div>
  );
}

export default PlanExportPanel;
