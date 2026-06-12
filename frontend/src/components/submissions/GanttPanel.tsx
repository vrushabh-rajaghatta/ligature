// ============================================================================
// GanttPanel — v0.66.0
// LIG-012 COMPLETE: Gantt Chart / Timeline View
//
// Features:
//   - Full-screen overlay with synced label + timeline scroll
//   - Three zoom presets: Week (22px/day) · Month (6px/day) · Quarter (2.2px/day)
//   - Task bars colour-coded by module section (M1–M5)
//   - Critical path tasks: amber stroke + ⚡ marker
//   - Status fill: complete=emerald · in-progress=section colour · not-started=muted
//   - Overdue tasks: red left-cap on bar
//   - Today line: red dashed vertical
//   - Trigger milestone: violet diamond marker
//   - Dependency bezier curves (toggleable)
//   - Section group separators in both label column and timeline
//   - Click task → detail panel (name, dates, status, deps)
//   - Jump to Today button
//   - Inactive rows: 30% opacity, strikethrough label
// ============================================================================


import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import {
  X, ZoomIn, ZoomOut, Calendar, Flag, GitBranch,
  ChevronRight, AlertTriangle, Lock, Zap,
} from 'lucide-react';
import {
  GlobalSubmissionPlan, GSPTask, TaskSection, TaskStatus,
} from '@/data/global-submission-plan-data';

// ============================================================================
// CONSTANTS
// ============================================================================

const LABEL_W   = 264;   // px — frozen left column
const ROW_H     = 38;    // px — task row height
const SECTION_H = 26;    // px — section group header row
const HEADER_H  = 52;    // px — timeline header (year 22 + month 30)
const BAR_H     = 20;    // px — task bar height
const BAR_R     = 4;     // px — bar corner radius
const PAD_DAYS  = 14;    // days of padding before first / after last task

type ZoomKey = 'week' | 'month' | 'quarter';
const ZOOM: Record<ZoomKey, { pxPerDay: number; label: string }> = {
  week:    { pxPerDay: 22,  label: 'Week'    },
  month:   { pxPerDay: 6,   label: 'Month'   },
  quarter: { pxPerDay: 2.2, label: 'Quarter' },
};

const SECTION_COLOR: Record<TaskSection, { bar: string; muted: string; bg: string; hdr: string; text: string }> = {
  M1: { bar: '#7c3aed', muted: '#4c1d95', bg: 'rgba(124,58,237,0.07)',  hdr: 'rgba(124,58,237,0.18)', text: '#a78bfa' },
  M2: { bar: '#0891b2', muted: '#164e63', bg: 'rgba(8,145,178,0.07)',   hdr: 'rgba(8,145,178,0.18)',  text: '#67e8f9' },
  M3: { bar: '#d97706', muted: '#78350f', bg: 'rgba(217,119,6,0.07)',   hdr: 'rgba(217,119,6,0.18)',  text: '#fbbf24' },
  M4: { bar: '#be185d', muted: '#831843', bg: 'rgba(190,24,93,0.07)',   hdr: 'rgba(190,24,93,0.18)',  text: '#f472b6' },
  M5: { bar: '#059669', muted: '#064e3b', bg: 'rgba(5,150,105,0.07)',   hdr: 'rgba(5,150,105,0.18)', text: '#34d399' },
};

const STATUS_BAR: Record<TaskStatus, (sectionBar: string, sectionMuted: string) => string> = {
  'complete':    () => '#059669',
  'in-progress': (bar) => bar,
  'not-started': (_b, muted) => muted,
  'on-hold':     () => '#92400e',
  'inactive':    () => '#374151',
};

// ============================================================================
// TYPES
// ============================================================================

type GanttRow =
  | { kind: 'section'; section: TaskSection; taskCount: number; yOffset: number }
  | { kind: 'task';    task: GSPTask;         rowIdx: number;    yOffset: number };

interface DetailTask {
  task: GSPTask;
  predecessors: GSPTask[];
  successors: GSPTask[];
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}
function daysFrom(origin: Date, d: Date): number {
  return (d.getTime() - origin.getTime()) / 86_400_000;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function fmtDate(s?: string): string {
  if (!s) return '—';
  return parseDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
function fmtMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short' });
}
function fmtYear(d: Date): string {
  return d.getFullYear().toString();
}
function getDaysOver(task: GSPTask): number {
  if (!task.plannedFinishDate || task.status === 'complete' || task.status === 'inactive' || task.isHolidayRow) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const finish = parseDate(task.plannedFinishDate);
  return Math.max(0, Math.ceil((today.getTime() - finish.getTime()) / 86_400_000));
}

// ============================================================================
// LAYOUT BUILDER
// ============================================================================

function buildRows(tasks: GSPTask[]): GanttRow[] {
  const sections: TaskSection[] = ['M1', 'M2', 'M3', 'M4', 'M5'];
  const rows: GanttRow[] = [];
  let y = HEADER_H;
  let taskRowIdx = 0;

  for (const section of sections) {
    const sectionTasks = tasks.filter(t => t.moduleSection === section && !t.isHolidayRow);
    if (sectionTasks.length === 0) continue;

    rows.push({ kind: 'section', section, taskCount: sectionTasks.length, yOffset: y });
    y += SECTION_H;

    for (const task of sectionTasks) {
      rows.push({ kind: 'task', task, rowIdx: taskRowIdx, yOffset: y });
      taskRowIdx++;
      y += ROW_H;
    }
  }
  return rows;
}

function buildDateRange(tasks: GSPTask[]): { origin: Date; endDate: Date } {
  const dates: Date[] = [];
  for (const t of tasks) {
    if (t.isHolidayRow) continue;
    if (t.plannedStartDate)  dates.push(parseDate(t.plannedStartDate));
    if (t.plannedFinishDate) dates.push(parseDate(t.plannedFinishDate));
    if (t.actualFinishDate)  dates.push(parseDate(t.actualFinishDate));
  }
  if (dates.length === 0) {
    const today = new Date();
    return { origin: addDays(today, -30), endDate: addDays(today, 90) };
  }
  const minMs = Math.min(...dates.map(d => d.getTime()));
  const maxMs = Math.max(...dates.map(d => d.getTime()));
  return {
    origin:  addDays(new Date(minMs), -PAD_DAYS),
    endDate: addDays(new Date(maxMs),  PAD_DAYS),
  };
}

// Generate month bands for the header
interface MonthBand { label: string; yearLabel: string; x: number; w: number; isNewYear: boolean }
function buildMonthBands(origin: Date, endDate: Date, pxPerDay: number): MonthBand[] {
  const bands: MonthBand[] = [];
  let d = new Date(origin.getFullYear(), origin.getMonth(), 1);
  while (d <= endDate) {
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const startX = Math.max(0, daysFrom(origin, d)) * pxPerDay;
    const endX   = daysFrom(origin, nextMonth) * pxPerDay;
    bands.push({
      label: fmtMonth(d),
      yearLabel: fmtYear(d),
      x: startX,
      w: endX - startX,
      isNewYear: d.getMonth() === 0,
    });
    d = nextMonth;
  }
  return bands;
}

// Week tick positions (for Week zoom)
function buildWeekTicks(origin: Date, endDate: Date, pxPerDay: number): { x: number; label: string }[] {
  const ticks: { x: number; label: string }[] = [];
  // Start from first Monday >= origin
  let d = new Date(origin);
  const day = d.getDay();
  if (day !== 1) d.setDate(d.getDate() + ((8 - day) % 7));
  while (d <= endDate) {
    ticks.push({
      x: daysFrom(origin, d) * pxPerDay,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
    d = addDays(d, 7);
  }
  return ticks;
}

// ============================================================================
// LABEL COLUMN ROW COMPONENTS
// ============================================================================

const SECTION_LABELS: Record<TaskSection, string> = {
  M1: 'Module 1', M2: 'Module 2', M3: 'Module 3', M4: 'Module 4', M5: 'Module 5',
};

function SectionLabelRow({ row }: { row: Extract<GanttRow, { kind: 'section' }> }) {
  const c = SECTION_COLOR[row.section];
  return (
    <div
      style={{ height: SECTION_H, background: c.hdr, borderTop: `1px solid ${c.bar}22`, display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 8, gap: 6, flexShrink: 0 }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: c.text, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
        {row.section}
      </span>
      <span style={{ fontSize: 10, color: c.text, opacity: 0.7 }}>{SECTION_LABELS[row.section]}</span>
      <span style={{ marginLeft: 'auto', fontSize: 10, color: c.text, opacity: 0.5 }}>{row.taskCount}</span>
    </div>
  );
}

function TaskLabelRow({
  row,
  selected,
  onClick,
}: {
  row: Extract<GanttRow, { kind: 'task' }>;
  selected: boolean;
  onClick: () => void;
}) {
  const { task } = row;
  const c = SECTION_COLOR[task.moduleSection];
  const isInactive = task.status === 'inactive';
  const daysOver = getDaysOver(task);

  return (
    <div
      onClick={onClick}
      style={{
        height: ROW_H,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 8,
        gap: 6,
        cursor: 'pointer',
        background: selected ? `${c.bar}22` : (row.rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'),
        borderLeft: selected ? `2px solid ${c.bar}` : '2px solid transparent',
        opacity: isInactive ? 0.35 : 1,
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ fontSize: 10, color: '#4b5563', width: 22, textAlign: 'right', flexShrink: 0 }}>
        {task.rowNum}
      </span>
      <span style={{ fontSize: 10, fontWeight: 600, color: c.text, fontFamily: 'monospace', flexShrink: 0 }}>
        {task.moduleSection}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 11,
          color: selected ? '#e2e8f0' : '#94a3b8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textDecoration: isInactive ? 'line-through' : 'none',
        }}>
          {task.taskName}
        </p>
        {daysOver > 0 && (
          <p style={{ fontSize: 9, color: '#f87171', display: 'flex', alignItems: 'center', gap: 2 }}>
            ▲ {daysOver}d overdue
          </p>
        )}
      </div>
      {task.isCriticalPath && (
        <span style={{ fontSize: 9, color: '#fbbf24', flexShrink: 0 }}>⚡</span>
      )}
      {task.isDateLocked && (
        <span style={{ fontSize: 9, color: '#a78bfa', flexShrink: 0 }}>🔒</span>
      )}
    </div>
  );
}

// ============================================================================
// DETAIL PANEL
// ============================================================================

function DetailPanel({ detail, onClose }: { detail: DetailTask; onClose: () => void }) {
  const { task, predecessors, successors } = detail;
  const c = SECTION_COLOR[task.moduleSection];
  const daysOver = getDaysOver(task);

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 300,
      background: '#0f172a',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', flexDirection: 'column',
      zIndex: 20,
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: c.text, background: `${c.bar}22`, padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 2 }}>
          {task.moduleSection}
        </span>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', flex: 1, lineHeight: 1.35 }}>{task.taskName}</p>
        <button onClick={onClose} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Status */}
        <div>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Status</p>
          <span style={{ fontSize: 11, color: task.status === 'complete' ? '#34d399' : task.status === 'in-progress' ? '#60a5fa' : task.status === 'inactive' ? '#6b7280' : '#94a3b8', fontWeight: 500 }}>
            {task.status.replace('-', ' ').replace(/^\w/, c => c.toUpperCase())}
          </span>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Start</p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(task.plannedStartDate)}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Finish</p>
            <p style={{ fontSize: 11, color: daysOver > 0 ? '#f87171' : '#94a3b8' }}>
              {fmtDate(task.plannedFinishDate)}
            </p>
          </div>
          {task.actualFinishDate && (
            <div>
              <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Actual Finish</p>
              <p style={{ fontSize: 11, color: '#34d399' }}>{fmtDate(task.actualFinishDate)}</p>
            </div>
          )}
          {task.duration != null && (
            <div>
              <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Duration</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>{task.duration}d working</p>
            </div>
          )}
        </div>

        {/* Overdue callout */}
        {daysOver > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>⚠️</span>
            <p style={{ fontSize: 11, color: '#fca5a5' }}>
              <strong>{daysOver}d overdue</strong>{task.isCriticalPath ? ' — on critical path' : ''}
            </p>
          </div>
        )}

        {/* Flags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {task.isCriticalPath && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
              ⚡ Critical Path
            </span>
          )}
          {task.isDateLocked && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
              🔒 Date Locked
            </span>
          )}
          {task.isDateCalculated && !task.isDateOverridden && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
              ⚡ Auto-calculated
            </span>
          )}
          {task.isDateOverridden && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.25)' }}>
              ✎ Overridden
            </span>
          )}
        </div>

        {/* Predecessors */}
        {predecessors.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 5 }}>Predecessors ({predecessors.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {predecessors.map(p => (
                <div key={p.id} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: SECTION_COLOR[p.moduleSection].text, fontFamily: 'monospace', fontSize: 10 }}>{p.moduleSection}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.rowNum}. {p.taskName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Successors */}
        {successors.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 5 }}>Successors ({successors.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {successors.map(s => (
                <div key={s.id} style={{ fontSize: 11, color: '#67e8f9', display: 'flex', gap: 6, alignItems: 'center', opacity: 0.8 }}>
                  <span style={{ color: SECTION_COLOR[s.moduleSection].text, fontFamily: 'monospace', fontSize: 10 }}>{s.moduleSection}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.rowNum}. {s.taskName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner */}
        {task.owner && (
          <div>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Owner</p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>{task.owner}</p>
          </div>
        )}

        {/* Notes */}
        {task.notes && (
          <div>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Notes</p>
            <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 }}>{task.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PANEL
// ============================================================================

interface GanttPanelProps {
  plan: GlobalSubmissionPlan;
  onClose: () => void;
}

export function GanttPanel({ plan, onClose }: GanttPanelProps) {
  const [zoom, setZoom] = useState<ZoomKey>('month');
  const [showDeps, setShowDeps] = useState(false);
  const [hideInactive, setHideInactive] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const labelBodyRef = useRef<HTMLDivElement>(null);

  // Sync vertical scroll: label body follows timeline
  const onTimelineScroll = useCallback(() => {
    if (labelBodyRef.current && timelineRef.current) {
      labelBodyRef.current.scrollTop = timelineRef.current.scrollTop;
    }
  }, []);

  const pxPerDay = ZOOM[zoom].pxPerDay;

  // Filtered tasks (respect hideInactive)
  const visibleTasks = useMemo(() => {
    let tasks = plan.tasks.filter(t => !t.isHolidayRow);
    if (hideInactive) tasks = tasks.filter(t => t.status !== 'inactive');
    return tasks;
  }, [plan.tasks, hideInactive]);

  // Rows layout
  const rows = useMemo(() => buildRows(visibleTasks), [visibleTasks]);

  // Successor map
  const successorMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of visibleTasks) {
      for (const pid of (t.predecessorIds ?? [])) {
        if (!map[pid]) map[pid] = [];
        map[pid].push(t.id);
      }
    }
    return map;
  }, [visibleTasks]);

  // Task index maps
  const taskById = useMemo(() => new Map(visibleTasks.map(t => [t.id, t])), [visibleTasks]);
  const taskRowById = useMemo(() => {
    const m = new Map<string, Extract<GanttRow, { kind: 'task' }>>();
    for (const r of rows) { if (r.kind === 'task') m.set(r.task.id, r); }
    return m;
  }, [rows]);

  // Date range + dimensions
  const { origin, endDate } = useMemo(() => buildDateRange(visibleTasks), [visibleTasks]);
  const totalDays = Math.ceil(daysFrom(origin, endDate)) + 1;
  const svgW = totalDays * pxPerDay;
  const totalRowsH = rows.reduce((acc, r) => acc + (r.kind === 'task' ? ROW_H : SECTION_H), 0);
  const svgH = HEADER_H + totalRowsH;

  // Month bands and week ticks
  const monthBands = useMemo(() => buildMonthBands(origin, endDate, pxPerDay), [origin, endDate, pxPerDay]);
  const weekTicks  = useMemo(() => zoom === 'week' ? buildWeekTicks(origin, endDate, pxPerDay) : [], [origin, endDate, pxPerDay, zoom]);

  // Today
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayX = daysFrom(origin, today) * pxPerDay;

  // Trigger milestone
  const milestoneX = plan.triggerMilestoneDate
    ? daysFrom(origin, parseDate(plan.triggerMilestoneDate)) * pxPerDay
    : null;

  // Date → X helper
  const dateToX = useCallback((s?: string): number | null => {
    if (!s) return null;
    return daysFrom(origin, parseDate(s)) * pxPerDay;
  }, [origin, pxPerDay]);

  // Jump to today
  const jumpToToday = useCallback(() => {
    if (timelineRef.current) {
      const scrollX = todayX - (timelineRef.current.clientWidth / 2);
      timelineRef.current.scrollLeft = Math.max(0, scrollX);
    }
  }, [todayX]);

  // Jump on zoom change
  useEffect(() => { jumpToToday(); }, [zoom]);

  // Detail panel
  const selectedDetail = useMemo((): DetailTask | null => {
    if (!selectedTaskId) return null;
    const task = taskById.get(selectedTaskId);
    if (!task) return null;
    const predecessors = (task.predecessorIds ?? []).map(id => taskById.get(id)).filter(Boolean) as GSPTask[];
    const successors = (successorMap[task.id] ?? []).map(id => taskById.get(id)).filter(Boolean) as GSPTask[];
    return { task, predecessors, successors };
  }, [selectedTaskId, taskById, successorMap]);

  // ============================================================================
  // SVG RENDER HELPERS
  // ============================================================================

  function renderHeader() {
    // Year bands (top 22px)
    const yearBands: { year: string; x: number; w: number }[] = [];
    let prevYear = '';
    let yearStartX = 0;
    for (const mb of monthBands) {
      if (mb.yearLabel !== prevYear) {
        if (prevYear) yearBands.push({ year: prevYear, x: yearStartX, w: mb.x - yearStartX });
        yearStartX = mb.x;
        prevYear = mb.yearLabel;
      }
    }
    if (prevYear) yearBands.push({ year: prevYear, x: yearStartX, w: svgW - yearStartX });

    return (
      <g>
        {/* Background */}
        <rect x={0} y={0} width={svgW} height={HEADER_H} fill="#0a0f1a" />

        {/* Year bands */}
        {yearBands.map(yb => (
          <g key={yb.year}>
            <rect x={yb.x} y={0} width={yb.w} height={22} fill="#111827" />
            <text x={yb.x + 8} y={15} fontSize={11} fontWeight={700} fill="#4b5563" fontFamily="monospace">
              {yb.year}
            </text>
            <line x1={yb.x} y1={0} x2={yb.x} y2={22} stroke="#1f2937" strokeWidth={1} />
          </g>
        ))}

        {/* Month bands */}
        {monthBands.map((mb, i) => (
          <g key={i}>
            <rect x={mb.x} y={22} width={mb.w} height={30} fill={i % 2 === 0 ? '#111827' : '#0d1525'} />
            {mb.w > 20 && (
              <text x={mb.x + 6} y={42} fontSize={11} fontWeight={600} fill="#6b7280" fontFamily="sans-serif">
                {mb.label}
              </text>
            )}
            <line x1={mb.x} y1={22} x2={mb.x} y2={HEADER_H} stroke={mb.isNewYear ? '#1f2937' : '#161f2e'} strokeWidth={mb.isNewYear ? 1.5 : 1} />
          </g>
        ))}

        {/* Week ticks (week zoom only) */}
        {weekTicks.map((wt, i) => (
          <g key={i}>
            <line x1={wt.x} y1={22} x2={wt.x} y2={HEADER_H} stroke="#1f2937" strokeWidth={1} strokeDasharray="3 2" />
            {wt.x > 0 && (
              <text x={wt.x + 3} y={46} fontSize={9} fill="#374151" fontFamily="sans-serif">{wt.label}</text>
            )}
          </g>
        ))}

        {/* Header bottom border */}
        <line x1={0} y1={HEADER_H} x2={svgW} y2={HEADER_H} stroke="#1f2937" strokeWidth={1.5} />
      </g>
    );
  }

  function renderRowBackgrounds() {
    return (
      <g>
        {rows.map((row, i) => {
          if (row.kind === 'section') {
            const c = SECTION_COLOR[row.section];
            return (
              <rect key={`sec-${row.section}`} x={0} y={row.yOffset} width={svgW} height={SECTION_H}
                fill={c.hdr} />
            );
          }
          const evenOdd = row.rowIdx % 2 === 0;
          const c = SECTION_COLOR[row.task.moduleSection];
          return (
            <rect key={row.task.id} x={0} y={row.yOffset} width={svgW} height={ROW_H}
              fill={evenOdd ? c?.bg : 'rgba(255,255,255,0.012)'}
              opacity={row.task.status === 'inactive' ? 0.4 : 1}
            />
          );
        })}
        {/* Horizontal grid lines */}
        {rows.map(row => (
          <line key={`grid-${row.kind}-${row.kind === 'task' ? row.task.id : row.section}`}
            x1={0} y1={row.yOffset} x2={svgW} y2={row.yOffset}
            stroke="rgba(255,255,255,0.04)" strokeWidth={0.5}
          />
        ))}
        {/* Month vertical guides */}
        {monthBands.map((mb, i) => (
          <line key={`vg-${i}`} x1={mb.x} y1={HEADER_H} x2={mb.x} y2={svgH}
            stroke={mb.isNewYear ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}
            strokeWidth={mb.isNewYear ? 1 : 0.5}
          />
        ))}
      </g>
    );
  }

  function renderDependencies() {
    if (!showDeps) return null;
    const arcs: React.JSX.Element[] = [];
    for (const row of rows) {
      if (row.kind !== 'task') continue;
      const { task } = row;
      const x2 = dateToX(task.plannedStartDate);
      if (x2 == null) continue;
      const y2 = row.yOffset + ROW_H / 2;

      for (const predId of (task.predecessorIds ?? [])) {
        const predRow = taskRowById.get(predId);
        if (!predRow) continue;
        const x1 = dateToX(predRow.task.plannedFinishDate);
        if (x1 == null) continue;
        const y1 = predRow.yOffset + ROW_H / 2;

        const isCritical = task.isCriticalPath && predRow.task.isCriticalPath;
        const cx1 = x1 + Math.abs(x2 - x1) * 0.5;
        const cx2 = x1 + Math.abs(x2 - x1) * 0.5;

        arcs.push(
          <path key={`dep-${predId}-${task.id}`}
            d={`M ${x1} ${y1} C ${cx1} ${y1} ${cx2} ${y2} ${x2} ${y2}`}
            fill="none"
            stroke={isCritical ? 'rgba(251,191,36,0.5)' : 'rgba(100,116,139,0.35)'}
            strokeWidth={isCritical ? 1.5 : 1}
            strokeDasharray={isCritical ? 'none' : '5 3'}
          />
        );
        // Arrowhead
        arcs.push(
          <polygon key={`arr-${predId}-${task.id}`}
            points={`${x2},${y2} ${x2 - 5},${y2 - 3} ${x2 - 5},${y2 + 3}`}
            fill={isCritical ? 'rgba(251,191,36,0.7)' : 'rgba(100,116,139,0.5)'}
          />
        );
      }
    }
    return <g>{arcs}</g>;
  }

  function renderBars() {
    return (
      <g>
        {rows.map(row => {
          if (row.kind !== 'task') return null;
          const { task } = row;
          const x1 = dateToX(task.plannedStartDate);
          const x2 = dateToX(task.plannedFinishDate ?? task.plannedStartDate);
          if (x1 == null || x2 == null) return null;

          const barX = Math.min(x1, x2);
          const barW = Math.max(Math.abs(x2 - x1), 4);
          const barY = row.yOffset + (ROW_H - BAR_H) / 2;

          const c = SECTION_COLOR[task.moduleSection];
          const barFill = STATUS_BAR[task.status](c.bar, c.muted);
          const isInactive = task.status === 'inactive';
          const isCritical = task.isCriticalPath;
          const daysOver = getDaysOver(task);
          const isSelected = selectedTaskId === task.id;

          // Actual finish overlay (for complete tasks with actualFinishDate)
          const actualX2 = task.actualFinishDate ? dateToX(task.actualFinishDate) : null;

          // LIG-013: Baseline bar (shown behind main bar if baseline exists)
          const bx1 = task.baselineStartDate ? dateToX(task.baselineStartDate) : null;
          const bx2 = task.baselineFinishDate ? dateToX(task.baselineFinishDate) : null;
          const hasBaseline = bx1 != null && bx2 != null;
          const baseBarX = hasBaseline ? Math.min(bx1!, bx2!) : 0;
          const baseBarW = hasBaseline ? Math.max(Math.abs(bx2! - bx1!), 4) : 0;

          return (
            <g key={task.id} opacity={isInactive ? 0.3 : 1}
              onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
              style={{ cursor: 'pointer' }}>
              {/* LIG-013: Baseline ghost bar */}
              {hasBaseline && !isInactive && (
                <rect
                  x={baseBarX} y={barY + 1}
                  width={baseBarW} height={BAR_H - 2}
                  rx={BAR_R}
                  fill="none"
                  stroke="rgba(148,163,184,0.5)"
                  strokeWidth={1}
                  strokeDasharray="3,2"
                />
              )}
              {/* Bar shadow */}
              {!isInactive && (
                <rect x={barX + 1} y={barY + 2} width={barW} height={BAR_H}
                  rx={BAR_R} fill="rgba(0,0,0,0.3)" />
              )}
              {/* Main bar */}
              <rect x={barX} y={barY} width={barW} height={BAR_H}
                rx={BAR_R}
                fill={barFill}
                stroke={isCritical ? '#fbbf24' : isSelected ? '#60a5fa' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isCritical ? 1.5 : isSelected ? 1.5 : 0.5}
                opacity={isInactive ? 0.6 : 1}
              />
              {/* Overdue red left cap */}
              {daysOver > 0 && (
                <rect x={barX} y={barY} width={4} height={BAR_H}
                  rx={BAR_R} fill="#ef4444" />
              )}
              {/* Actual finish marker */}
              {actualX2 != null && task.status === 'complete' && (
                <line x1={actualX2} y1={barY - 2} x2={actualX2} y2={barY + BAR_H + 2}
                  stroke="#34d399" strokeWidth={1.5} />
              )}
              {/* Label inside bar (if wide enough) */}
              {barW > 60 && (
                <text x={barX + 7} y={barY + BAR_H / 2 + 4}
                  fontSize={9} fill="rgba(255,255,255,0.85)" fontFamily="sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {task.taskName.length > Math.floor(barW / 7) - 2
                    ? task.taskName.slice(0, Math.floor(barW / 7) - 2) + '…'
                    : task.taskName}
                </text>
              )}
              {/* Critical ⚡ badge */}
              {isCritical && barW > 20 && (
                <text x={barX + barW - 14} y={barY + BAR_H / 2 + 4}
                  fontSize={9} fill="#fbbf24" fontFamily="sans-serif"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  ⚡
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  function renderTodayLine() {
    if (todayX < 0 || todayX > svgW) return null;
    return (
      <g>
        <line x1={todayX} y1={HEADER_H} x2={todayX} y2={svgH}
          stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.7} />
        <rect x={todayX - 20} y={HEADER_H - 0.5} width={40} height={16}
          rx={3} fill="#ef4444" opacity={0.9} />
        <text x={todayX} y={HEADER_H + 11} fontSize={9} fontWeight={700}
          fill="white" textAnchor="middle" fontFamily="sans-serif"
          style={{ userSelect: 'none' }}>
          TODAY
        </text>
      </g>
    );
  }

  function renderMilestoneLine() {
    if (milestoneX == null || milestoneX < 0 || milestoneX > svgW) return null;
    const MX = milestoneX;
    const MY = HEADER_H + 6;
    const S = 8; // diamond half-size
    return (
      <g>
        <line x1={MX} y1={HEADER_H} x2={MX} y2={svgH}
          stroke="#a78bfa" strokeWidth={1} strokeDasharray="8 4" opacity={0.5} />
        {/* Diamond */}
        <polygon points={`${MX},${MY - S} ${MX + S},${MY} ${MX},${MY + S} ${MX - S},${MY}`}
          fill="#7c3aed" stroke="#a78bfa" strokeWidth={1} />
        <text x={MX + 12} y={MY + 4} fontSize={9} fill="#a78bfa" fontFamily="sans-serif">
          {plan.triggerMilestoneName?.split('—')[0]?.trim() ?? 'Milestone'}
        </text>
      </g>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  const totalH = HEADER_H + totalRowsH;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: '#060d1a',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* ── HEADER BAR ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        background: '#0a1120', borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Gantt Chart</span>
          <span style={{ fontSize: 12, color: '#4b5563' }}>·</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{plan.name}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#111827', borderRadius: 6, padding: 2 }}>
          {(['quarter', 'month', 'week'] as ZoomKey[]).map(z => (
            <button key={z} onClick={() => setZoom(z)} style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: zoom === z ? '#1e40af' : 'transparent',
              color: zoom === z ? '#93c5fd' : '#4b5563',
              transition: 'all 0.15s',
            }}>
              {ZOOM[z].label}
            </button>
          ))}
        </div>

        {/* Show Dependencies */}
        <button onClick={() => setShowDeps(!showDeps)} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
          border: `1px solid ${showDeps ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
          background: showDeps ? 'rgba(96,165,250,0.1)' : 'transparent',
          color: showDeps ? '#60a5fa' : '#4b5563', cursor: 'pointer', fontSize: 11, fontWeight: 500,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          Dependencies
        </button>

        {/* Hide Inactive */}
        <button onClick={() => setHideInactive(!hideInactive)} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
          border: `1px solid ${hideInactive ? 'rgba(100,116,139,0.4)' : 'rgba(255,255,255,0.08)'}`,
          background: hideInactive ? 'rgba(100,116,139,0.12)' : 'transparent',
          color: hideInactive ? '#94a3b8' : '#4b5563', cursor: 'pointer', fontSize: 11, fontWeight: 500,
        }}>
          Hide Inactive
        </button>

        {/* Jump to Today */}
        <button onClick={jumpToToday} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6,
          border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)',
          color: '#fca5a5', cursor: 'pointer', fontSize: 11, fontWeight: 500,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          Today
        </button>

        {/* Close */}
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
          color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 500,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          Close
        </button>
      </div>

      {/* ── LEGEND ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '6px 16px',
        background: '#080f1c', borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {[
          { color: '#059669', label: 'Complete' },
          { color: '#2563eb', label: 'In Progress' },
          { color: '#374151', label: 'Not Started' },
          { color: '#fbbf24', label: 'Critical Path', border: '#fbbf24' },
          { color: '#ef4444', label: 'Overdue', cap: true },
          { color: '#a78bfa', label: 'Trigger Milestone', diamond: true },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {item.diamond ? (
              <svg width="10" height="10" viewBox="-6 -6 12 12">
                <polygon points="0,-5 5,0 0,5 -5,0" fill="#7c3aed" stroke="#a78bfa" strokeWidth="1"/>
              </svg>
            ) : (
              <div style={{
                width: item.cap ? 3 : 14, height: 9, borderRadius: item.cap ? 1 : 2,
                background: item.color,
                border: item.border ? `1.5px solid ${item?.border ?? ''}` : 'none',
                ...(item.cap ? {} : {}),
              }} />
            )}
            <span style={{ fontSize: 10, color: '#4b5563' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#374151' }}>
          {visibleTasks.length} tasks · {visibleTasks.filter(t => t.status === 'complete').length} complete
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Label column */}
        <div style={{
          width: LABEL_W, flexShrink: 0,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column',
          background: '#080f1c',
          zIndex: 10,
        }}>
          {/* Corner header */}
          <div style={{
            height: HEADER_H, flexShrink: 0,
            display: 'flex', alignItems: 'flex-end',
            padding: '0 12px 8px',
            borderBottom: '1.5px solid rgba(255,255,255,0.1)',
            background: '#0a0f1a',
          }}>
            <span style={{ fontSize: 10, color: '#374151', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Task
            </span>
          </div>
          {/* Label rows — overflow hidden, scroll synced to timeline */}
          <div ref={labelBodyRef} style={{ flex: 1, overflow: 'hidden' }}>
            {rows.map((row, i) => (
              row.kind === 'section'
                ? <SectionLabelRow key={`sec-${row.section}`} row={row} />
                : <TaskLabelRow
                    key={row.task.id}
                    row={row}
                    selected={selectedTaskId === row.task.id}
                    onClick={() => setSelectedTaskId(selectedTaskId === row.task.id ? null : row.task.id)}
                  />
            ))}
          </div>
        </div>

        {/* Timeline pane */}
        <div
          ref={timelineRef}
          onScroll={onTimelineScroll}
          style={{ flex: 1, overflow: 'auto', position: 'relative' }}
        >
          <svg
            width={svgW}
            height={totalH}
            style={{ display: 'block', background: '#06090f' }}
          >
            {renderRowBackgrounds()}
            {renderHeader()}
            {renderDependencies()}
            {renderBars()}
            {renderTodayLine()}
            {renderMilestoneLine()}
          </svg>
        </div>

        {/* Detail panel */}
        {selectedDetail && (
          <DetailPanel detail={selectedDetail} onClose={() => setSelectedTaskId(null)} />
        )}
      </div>
    </div>
  );
}

export default GanttPanel;
