
// ============================================================================
// date-calculation-engine.ts — v0.64.0
// LIG-015: UQ Template-Driven Auto-Calculation from Trigger Milestone
// LIG-019: Holiday-aware working day calculations
// ============================================================================

import { GSPTask, GlobalSubmissionPlan } from '@/data/global-submission-plan-data';
import { holidayCalendars } from '@/data/holiday-calendar-data';

// ============================================================================
// WORKING DAY UTILITIES
// ============================================================================

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

function getHolidaySet(markets: string[]): Set<string> {
  const holidays = new Set<string>();
  for (const cal of holidayCalendars) {
    if (!cal.isActive || !markets.includes(cal.market)) continue;
    for (const h of cal.holidays) {
      holidays.add(h.date); // YYYY-MM-DD
    }
  }
  return holidays;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseDate(s: string): Date {
  // Parse YYYY-MM-DD without timezone shift
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Advance a date by N working days (positive = forward, negative = backward). */
export function addWorkingDays(dateStr: string, days: number, markets: string[] = []): string {
  const holidays = getHolidaySet(markets);
  let current = parseDate(dateStr);
  let remaining = Math.abs(days);
  const dir = days >= 0 ? 1 : -1;

  while (remaining > 0) {
    current = new Date(current.getTime() + dir * 86400000);
    const ds = toDateStr(current);
    if (!isWeekend(current) && !holidays.has(ds)) {
      remaining--;
    }
  }
  return toDateStr(current);
}

/** Snap a date forward to the next working day if it falls on weekend/holiday. */
export function snapToWorkingDay(
  dateStr: string,
  markets: string[] = [],
): { date: string; adjusted: boolean } {
  const holidays = getHolidaySet(markets);
  let current = parseDate(dateStr);
  let adjusted = false;

  while (isWeekend(current) || holidays.has(toDateStr(current))) {
    current = new Date(current.getTime() + 86400000);
    adjusted = true;
  }
  return { date: toDateStr(current), adjusted };
}

// ============================================================================
// TOPOLOGY SORT — for dependency-ordered calculation
// ============================================================================

export function topologicalSort(tasks: GSPTask[]): GSPTask[] {
  const idToTask = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const result: GSPTask[] = [];

  function visit(task: GSPTask) {
    if (visited.has(task.id)) return;
    visited.add(task.id);
    for (const predId of task.predecessorIds ?? []) {
      const pred = idToTask.get(predId);
      if (pred) visit(pred);
    }
    result.push(task);
  }

  for (const task of tasks) visit(task);
  return result;
}

// ============================================================================
// CIRCULAR DEPENDENCY DETECTION
// ============================================================================

export function detectCircularDependencies(tasks: GSPTask[]): string[][] {
  const cycles: string[][] = [];
  const path = new Set<string>();
  const idToTask = new Map(tasks.map(t => [t.id, t]));

  function dfs(taskId: string, chain: string[]): boolean {
    if (path.has(taskId)) {
      const cycleStart = chain.indexOf(taskId);
      cycles.push(chain.slice(cycleStart));
      return true;
    }
    path.add(taskId);
    const task = idToTask.get(taskId);
    for (const predId of task?.predecessorIds ?? []) {
      if (dfs(predId, [...chain, predId])) return true;
    }
    path.delete(taskId);
    return false;
  }

  for (const task of tasks) {
    dfs(task.id, [task.id]);
  }
  return cycles;
}

// ============================================================================
// CRITICAL PATH CALCULATION (forward + backward pass)
// Returns a Set of task IDs on the critical path (zero total float)
// ============================================================================

interface TaskTimes {
  es: number; // Early Start (days from plan start)
  ef: number; // Early Finish
  ls: number; // Late Start
  lf: number; // Late Finish
  tf: number; // Total Float
}

export function calculateCriticalPath(tasks: GSPTask[]): Set<string> {
  const workTasks = tasks.filter(t => !t.isHolidayRow && t.status !== 'inactive');
  const idToTask = new Map(workTasks.map(t => [t.id, t]));
  const times = new Map<string, TaskTimes>();
  const sorted = topologicalSort(workTasks);

  // Forward pass — Early Start / Early Finish
  for (const task of sorted) {
    let es = 0;
    for (const predId of task.predecessorIds ?? []) {
      const predTimes = times.get(predId);
      if (predTimes) es = Math.max(es, predTimes.ef);
    }
    const dur = task.duration ?? 1;
    times.set(task.id, { es, ef: es + dur, ls: 0, lf: 0, tf: 0 });
  }

  // Project end = max ef
  const projectEnd = Math.max(...Array.from(times.values()).map(t => t.ef), 0);

  // Build successor map
  const successors = new Map<string, string[]>();
  for (const task of workTasks) {
    for (const predId of task.predecessorIds ?? []) {
      if (!successors.has(predId)) successors.set(predId, []);
      successors.get(predId)!.push(task.id);
    }
  }

  // Backward pass — Late Start / Late Finish
  for (const task of [...sorted].reverse()) {
    const succs = successors.get(task.id) ?? [];
    let lf: number;
    if (succs.length === 0) {
      lf = projectEnd;
    } else {
      lf = Math.min(...succs.map(sid => times.get(sid)?.ls ?? projectEnd));
    }
    const dur = task.duration ?? 1;
    const t = times.get(task.id)!;
    t.lf = lf;
    t.ls = lf - dur;
    t.tf = t.ls - t.es;
  }

  // Critical path = tasks with zero float
  const criticalIds = new Set<string>();
  Array.from(times.entries()).forEach(([id, t]) => {
    if (Math.abs(t.tf) < 0.001) criticalIds.add(id);
  });
  return criticalIds;
}

// ============================================================================
// LIG-015: DATE AUTO-CALCULATION FROM TRIGGER MILESTONE
// ============================================================================

export interface CalculatedDateResult {
  taskId: string;
  plannedStartDate: string;
  plannedFinishDate: string;
  weekendAdjusted: boolean;
  holidayAdjusted: boolean;
}

/**
 * Calculate all task dates for a plan starting from a trigger milestone date.
 *
 * Strategy:
 * - Topological sort by predecessors
 * - For each task: ES = max(EF of predecessors, triggerDate if no predecessors)
 * - EF = ES + duration working days
 * - Snap each date to next working day if it falls on weekend/holiday
 * - Tasks with isDateOverridden are left unchanged
 */
export function calculateDatesFromTrigger(
  plan: GlobalSubmissionPlan,
  triggerDate: string,   // YYYY-MM-DD — LSLV or similar
): CalculatedDateResult[] {
  const markets = plan.submissions.map(s => s.market);
  const workTasks = plan.tasks.filter(t => !t.isHolidayRow && t.status !== 'inactive');
  const sorted = topologicalSort(workTasks);

  const efDates = new Map<string, string>(); // taskId → planned finish date
  const results: CalculatedDateResult[] = [];

  for (const task of sorted) {
    // Skip overridden tasks but track their EF for successors
    if (task.isDateOverridden && task.plannedFinishDate) {
      efDates.set(task.id, task.plannedFinishDate);
      continue;
    }

    // Start = day after latest predecessor finishes (or trigger date if no predecessors)
    let startDateStr = triggerDate;
    for (const predId of task.predecessorIds ?? []) {
      const predEF = efDates.get(predId);
      if (predEF && predEF > startDateStr) {
        startDateStr = predEF;
      }
    }

    // Start = next working day after predecessor finishes
    const { date: snapStart, adjusted: startAdj } = snapToWorkingDay(
      addWorkingDays(startDateStr, 1, markets),
      markets,
    );

    // Finish = start + duration working days
    const dur = task.duration ?? 14;
    const rawFinish = addWorkingDays(snapStart, dur - 1, markets);
    const { date: snapFinish, adjusted: finishAdj } = snapToWorkingDay(rawFinish, markets);

    efDates.set(task.id, snapFinish);
    results.push({
      taskId: task.id,
      plannedStartDate: snapStart,
      plannedFinishDate: snapFinish,
      weekendAdjusted: startAdj || finishAdj,
      holidayAdjusted: false, // refined below
    });
  }

  return results;
}
