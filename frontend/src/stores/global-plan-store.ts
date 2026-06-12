
// ============================================================================
// global-plan-store.ts — v0.64.0
// LIG-003, LIG-004, LIG-010, LIG-015, LIG-016
// ============================================================================

import { create } from 'zustand';
import {
  GlobalSubmissionPlan, GSPTask, TaskStatus, allPlans,
  GSPSubmission, ProvisioningStatus,
} from '@/data/global-submission-plan-data';
import { calculateDatesFromTrigger, calculateCriticalPath } from '@/lib/date-calculation-engine';

interface AddSubmissionResult {
  addedTaskCount: number;
  linkedCpiCount: number;
  auditNote: string;
}

interface GlobalPlanStore {
  plans: GlobalSubmissionPlan[];
  activePlanId: string | null;
  getActivePlan: () => GlobalSubmissionPlan | null;
  setActivePlan: (id: string) => void;
  updateTaskStatus: (planId: string, taskId: string, status: TaskStatus) => void;
  updateTaskOwner: (planId: string, taskId: string, owner: string) => void;
  addSubmissionToPlan: (planId: string, newSubmission: GSPSubmission) => AddSubmissionResult;
  retryProvisioning: (planId: string) => void;
  clearProvisioningError: (planId: string) => void;
  // LIG-010: Row inactivation
  toggleTaskInactive: (planId: string, taskId: string, by?: string) => void;
  // LIG-015: Trigger milestone + date calculation
  setTriggerMilestone: (planId: string, name: string, date: string) => void;
  recalculateDates: (planId: string) => { count: number; adjusted: number };
  overrideTaskDate: (planId: string, taskId: string, field: 'start' | 'finish', date: string) => void;
  clearDateOverride: (planId: string, taskId: string) => void;
  // LIG-016: Recalculate critical path
  refreshCriticalPath: (planId: string) => void;
  // LIG-017: Days-over computation
  refreshDaysOver: (planId: string) => number; // returns count of delayed tasks
  // LIG-018: Inline date edit + lock
  updateTaskDates: (planId: string, taskId: string, startDate?: string, finishDate?: string) => void;
  toggleDateLock: (planId: string, taskId: string) => void;
  batchLockDates: (planId: string, taskIds: string[]) => void;
  // LIG-013: Baseline snapshot
  setBaseline: (planId: string, capturedBy?: string) => { count: number };
  clearBaseline: (planId: string) => void;
}

function generateDeltaTasks(submission: GSPSubmission, existingTasks: GSPTask[]): { newTasks: GSPTask[]; linkedRowIds: string[] } {
  const existing = new Set(existingTasks.map(t => `${t.ctdSection}|${t.taskName}`));
  const highestRow = Math.max(...existingTasks.map(t => t.rowNum), 0);
  const candidates: Omit<GSPTask, 'id' | 'rowNum'>[] = [
    { taskName: `${submission.market} Regional Cover Letter`, ctdSection: '1.0', moduleSection: 'M1', phase: 'Authoring', submissionIds: [submission.id], markets: [submission.market], isLeadMarketTask: false, status: 'not-started', duration: 14 },
    { taskName: `${submission.market} Prescribing Information / SmPC`, ctdSection: '1.3', moduleSection: 'M1', phase: 'Authoring', submissionIds: [submission.id], markets: [submission.market], isLeadMarketTask: false, status: 'not-started', duration: 45 },
    { taskName: `${submission.market} eCTD Sequence Compilation`, ctdSection: 'All', moduleSection: 'M1', phase: 'Publishing', submissionIds: [submission.id], markets: [submission.market], isLeadMarketTask: false, status: 'not-started', duration: 30 },
  ];
  const newTasks: GSPTask[] = candidates
    .filter(c => !existing.has(`${c.ctdSection}|${c.taskName}`))
    .map((c, i) => ({ ...c, id: `added-${submission.id}-${i}`, rowNum: highestRow + i + 1 }));
  const linkedRowIds = existingTasks.filter(t => t.cpiSharedMarkets && t.cpiSharedMarkets.length > 0).map(t => t.id);
  return { newTasks, linkedRowIds };
}

export const useGlobalPlanStore = create<GlobalPlanStore>((set, get) => ({
  plans: allPlans,
  activePlanId: 'gsp-lig-001',

  getActivePlan: () => {
    const { plans, activePlanId } = get();
    return plans.find(p => p.id === activePlanId) ?? null;
  },

  setActivePlan: (id) => set({ activePlanId: id }),

  updateTaskStatus: (planId, taskId, status) =>
    set(state => ({
      plans: state.plans.map(plan =>
        plan.id !== planId ? plan : {
          ...plan,
          tasks: plan.tasks.map(t => t.id !== taskId ? t : { ...t, status }),
        }
      ),
    })),

  updateTaskOwner: (planId, taskId, owner) =>
    set(state => ({
      plans: state.plans.map(plan =>
        plan.id !== planId ? plan : {
          ...plan,
          tasks: plan.tasks.map(t => t.id !== taskId ? t : { ...t, owner }),
        }
      ),
    })),

  // LIG-010: Toggle a task's inactive state
  // On inactivation: clear dates, predecessors, resource; store template values
  // On re-activation: restore template values
  toggleTaskInactive: (planId, taskId, by = 'User') =>
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        return {
          ...plan,
          tasks: plan.tasks.map(t => {
            if (t.id !== taskId) return t;
            if (t.status !== 'inactive') {
              // Activate → Inactive: store template values, clear fields
              return {
                ...t,
                status: 'inactive' as TaskStatus,
                // Store templated values for restoration
                templatePredecessorIds: t.predecessorIds ?? [],
                templateDuration: t.duration,
                // Clear dependency/resource fields per AC
                predecessorIds: [],
                plannedStartDate: undefined,
                plannedFinishDate: undefined,
                isCriticalPath: false,
                inactivatedAt: new Date().toISOString(),
                inactivatedBy: by,
              };
            } else {
              // Inactive → Re-activate: restore template values
              return {
                ...t,
                status: 'not-started' as TaskStatus,
                predecessorIds: t.templatePredecessorIds ?? [],
                duration: t.templateDuration ?? t.duration,
                isCriticalPath: false,
                inactivatedAt: undefined,
                inactivatedBy: undefined,
              };
            }
          }),
        };
      }),
    })),

  // LIG-015: Set trigger milestone date
  setTriggerMilestone: (planId, name, date) =>
    set(state => ({
      plans: state.plans.map(p =>
        p.id !== planId ? p : { ...p, triggerMilestoneName: name, triggerMilestoneDate: date }
      ),
    })),

  // LIG-015: Recalculate all non-overridden task dates from trigger milestone
  recalculateDates: (planId) => {
    const plan = get().plans.find(p => p.id === planId);
    if (!plan?.triggerMilestoneDate) return { count: 0, adjusted: 0 };

    const results = calculateDatesFromTrigger(plan, plan.triggerMilestoneDate);
    const adjustedCount = results.filter(r => r.weekendAdjusted || r.holidayAdjusted).length;

    set(state => ({
      plans: state.plans.map(p => {
        if (p.id !== planId) return p;
        const resultMap = new Map(results.map(r => [r.taskId, r]));
        return {
          ...p,
          datesCalculatedAt: new Date().toISOString(),
          tasks: p.tasks.map(t => {
            const r = resultMap.get(t.id);
            if (!r || t.isDateOverridden || t.isDateLocked || t.isHolidayRow) return t;
            return {
              ...t,
              plannedStartDate: r.plannedStartDate,
              plannedFinishDate: r.plannedFinishDate,
              isDateCalculated: true,
              weekendAdjusted: r.weekendAdjusted,
            };
          }),
        };
      }),
    }));

    return { count: results.length, adjusted: adjustedCount };
  },

  // LIG-015: Override a single calculated date
  overrideTaskDate: (planId, taskId, field, date) =>
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        return {
          ...plan,
          tasks: plan.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              ...(field === 'start'
                ? { plannedStartDate: date }
                : { plannedFinishDate: date }),
              isDateOverridden: true,
              isDateCalculated: false,
            };
          }),
        };
      }),
    })),

  // LIG-015: Clear override — next recalculate will set new value
  clearDateOverride: (planId, taskId) =>
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        return {
          ...plan,
          tasks: plan.tasks.map(t =>
            t.id !== taskId ? t : { ...t, isDateOverridden: false, isDateCalculated: false }
          ),
        };
      }),
    })),

  // LIG-016: Recalculate which tasks are on the critical path
  refreshCriticalPath: (planId) => {
    const plan = get().plans.find(p => p.id === planId);
    if (!plan) return;
    const criticalIds = calculateCriticalPath(plan.tasks);
    set(state => ({
      plans: state.plans.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => ({
            ...t,
            isCriticalPath: t.isHolidayRow ? false : criticalIds.has(t.id),
          })),
        };
      }),
    }));
  },

  // LIG-017: Compute and store daysOver for all tasks in a plan
  refreshDaysOver: (planId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let delayCount = 0;
    set(state => ({
      plans: state.plans.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.isHolidayRow || t.status === 'complete' || t.status === 'inactive' || !t.plannedFinishDate) {
              return { ...t, daysOver: undefined };
            }
            const finish = new Date(t.plannedFinishDate);
            finish.setHours(0, 0, 0, 0);
            const over = Math.ceil((today.getTime() - finish.getTime()) / (1000 * 60 * 60 * 24));
            if (over > 0) {
              delayCount++;
              return { ...t, daysOver: over };
            }
            return { ...t, daysOver: undefined };
          }),
        };
      }),
    }));
    return delayCount;
  },

  // LIG-018: Inline date edit — sets both dates and marks as overridden if task was calculated
  updateTaskDates: (planId, taskId, startDate, finishDate) =>
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        return {
          ...plan,
          tasks: plan.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              ...(startDate !== undefined ? { plannedStartDate: startDate } : {}),
              ...(finishDate !== undefined ? { plannedFinishDate: finishDate } : {}),
              isDateOverridden: t.isDateCalculated ? true : t.isDateOverridden,
              isDateCalculated: false,
            };
          }),
        };
      }),
    })),

  // LIG-018: Toggle date lock on a task
  toggleDateLock: (planId, taskId) =>
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        return {
          ...plan,
          tasks: plan.tasks.map(t =>
            t.id !== taskId ? t : { ...t, isDateLocked: !t.isDateLocked }
          ),
        };
      }),
    })),

  // LIG-018: Lock all dates for a batch of tasks (e.g. all calculated tasks)
  batchLockDates: (planId, taskIds) =>
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        const lockSet = new Set(taskIds);
        return {
          ...plan,
          tasks: plan.tasks.map(t =>
            lockSet.has(t.id) ? { ...t, isDateLocked: true } : t
          ),
        };
      }),
    })),

  addSubmissionToPlan: (planId, newSubmission) => {
    const plan = get().plans.find(p => p.id === planId);
    if (!plan) return { addedTaskCount: 0, linkedCpiCount: 0, auditNote: 'Plan not found' };
    const { newTasks, linkedRowIds } = generateDeltaTasks(newSubmission, plan.tasks);
    set(state => ({
      plans: state.plans.map(p => {
        if (p.id !== planId) return p;
        return {
          ...p,
          submissions: [...p.submissions, newSubmission],
          satelliteMarkets: [...p.satelliteMarkets, newSubmission.market],
          tasks: [
            ...p.tasks.map(t =>
              linkedRowIds.includes(t.id) && t.cpiSharedMarkets
                ? { ...t, submissionIds: [...t.submissionIds, newSubmission.id], markets: [...t.markets, newSubmission.market], cpiSharedMarkets: [...t.cpiSharedMarkets, newSubmission.market] }
                : t
            ),
            ...newTasks,
          ],
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }),
    }));
    return {
      addedTaskCount: newTasks.length,
      linkedCpiCount: linkedRowIds.length,
      auditNote: `Added ${newTasks.length} delta task(s) for ${newSubmission.market} ${newSubmission.type}. Linked ${linkedRowIds.length} existing CPI rows to new market.`,
    };
  },


  // LIG-013: Capture baseline — freeze current plannedStartDate/plannedFinishDate per task
  setBaseline: (planId, capturedBy = 'Current User') => {
    let count = 0;
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        count = plan.tasks.filter(t => !t.isHolidayRow && t.plannedFinishDate).length;
        return {
          ...plan,
          baselineCapturedAt: new Date().toISOString(),
          baselineCapturedBy: capturedBy,
          tasks: plan.tasks.map(t => ({
            ...t,
            baselineStartDate: t.plannedStartDate,
            baselineFinishDate: t.plannedFinishDate,
          })),
        };
      }),
    }));
    return { count };
  },

  // LIG-013: Clear baseline from plan + all tasks
  clearBaseline: (planId) =>
    set(state => ({
      plans: state.plans.map(plan => {
        if (plan.id !== planId) return plan;
        const { baselineCapturedAt, baselineCapturedBy, ...rest } = plan as any;
        return {
          ...rest,
          tasks: plan.tasks.map(t => {
            const { baselineStartDate, baselineFinishDate, ...taskRest } = t as any;
            return taskRest;
          }),
        };
      }),
    })),

  retryProvisioning: (planId) =>
    set(state => ({
      plans: state.plans.map(p =>
        p.id !== planId ? p : { ...p, provisioningStatus: 'provisioning' as ProvisioningStatus, provisioningError: undefined }
      ),
    })),

  clearProvisioningError: (planId) =>
    set(state => ({
      plans: state.plans.map(p =>
        p.id !== planId ? p : { ...p, provisioningStatus: 'active' as ProvisioningStatus, provisioningError: undefined, status: 'active' as const }
      ),
    })),
}));
