

// =============================================================================
// SUBMISSION CALENDAR STORE - v0.9.17b
// =============================================================================
// Zustand store for managing submission deadlines, milestones, and calendar
// events. Integrates with sequence templates for deadline estimation.
// =============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useMemo } from 'react';
import type {
  SubmissionCalendarState,
  SubmissionCalendarActions,
  SubmissionDeadline,
  SubmissionMilestone,
  SubmissionCalendarEvent,
  SubmissionDeadlineStatus,
  MilestoneStatus,
  SubmissionCalendarStatistics,
  SubmissionCalendarFilters,
  SubmissionCalendarView,
  CalendarViewMode,
  DeadlineEstimationConfig,
  EstimatedTimeline,
  LeadTimeConfig,
} from './submission-calendar-types';
import {
  generateSubmissionCalendarId,
  DEFAULT_CALENDAR_FILTERS,
  getLeadTimeConfig,
  US_NDA_LEAD_TIME,
} from './submission-calendar-types';
import type { RegulatoryRegion } from './ectd-regional-types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Calculate days until a date */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Determine deadline status based on due date and current status */
function calculateDeadlineStatus(
  dueDate: string,
  currentStatus: SubmissionDeadlineStatus,
  warningDays: number
): SubmissionDeadlineStatus {
  if (['completed', 'completed-late', 'extended', 'waived', 'cancelled'].includes(currentStatus)) {
    return currentStatus;
  }
  
  const days = daysUntil(dueDate);
  
  if (days < 0) return 'overdue';
  if (days === 0) return 'due-today';
  if (days <= warningDays) return 'approaching';
  return 'pending';
}

/** Add days to a date string */
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/** Get current month in YYYY-MM format */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: SubmissionCalendarState = {
  deadlines: {},
  deadlineIndex: [],
  milestones: {},
  milestoneIndex: [],
  calendarEvents: [],
  selectedDeadlineId: null,
  selectedMilestoneId: null,
  selectedDate: null,
  activeView: 'calendar',
  viewMode: 'month',
  currentMonth: getCurrentMonth(),
  filters: { ...DEFAULT_CALENDAR_FILTERS },
  statistics: null,
  isLoading: false,
  error: null,
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useSubmissionCalendarStore = create<SubmissionCalendarState & SubmissionCalendarActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // =========================================================================
      // DEADLINE CRUD
      // =========================================================================

      createDeadline: (deadlineData) => {
        const id = generateSubmissionCalendarId.deadline();
        const now = new Date().toISOString();
        
        const deadline: SubmissionDeadline = {
          id,
          ...deadlineData,
          status: calculateDeadlineStatus(
            deadlineData.dueDate,
            deadlineData.status,
            deadlineData.warningDays
          ),
          remindersSent: 0,
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          deadlines: { ...state.deadlines, [id]: deadline },
          deadlineIndex: [...state.deadlineIndex, id],
        }));

        // Auto-sync calendar events
        get().syncCalendarEvents();
        
        return id;
      },

      updateDeadline: (id, updates) => {
        const deadline = get().deadlines[id];
        if (!deadline) return;

        const updatedDeadline: SubmissionDeadline = {
          ...deadline,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // Recalculate status if due date changed
        if (updates.dueDate) {
          updatedDeadline.status = calculateDeadlineStatus(
            updatedDeadline.dueDate,
            updatedDeadline.status,
            updatedDeadline.warningDays
          );
        }

        set(state => ({
          deadlines: { ...state.deadlines, [id]: updatedDeadline },
        }));

        get().syncCalendarEvents();
      },

      deleteDeadline: (id) => {
        set(state => {
          const { [id]: _, ...remaining } = state.deadlines;
          return {
            deadlines: remaining,
            deadlineIndex: state.deadlineIndex.filter(did => did !== id),
            selectedDeadlineId: state.selectedDeadlineId === id ? null : state.selectedDeadlineId,
          };
        });

        get().syncCalendarEvents();
      },

      completeDeadline: (id, completedBy) => {
        const deadline = get().deadlines[id];
        if (!deadline) return;

        const now = new Date().toISOString();
        const dueDate = new Date(deadline.dueDate);
        const completedDate = new Date(now);
        
        const isLate = completedDate > dueDate;

        set(state => ({
          deadlines: {
            ...state.deadlines,
            [id]: {
              ...deadline,
              status: isLate ? 'completed-late' : 'completed',
              completedDate: now,
              completedBy,
              updatedAt: now,
            },
          },
        }));

        get().syncCalendarEvents();
      },

      extendDeadline: (id, newDueDate, reason, approvedBy) => {
        const deadline = get().deadlines[id];
        if (!deadline) return;

        const now = new Date().toISOString();

        set(state => ({
          deadlines: {
            ...state.deadlines,
            [id]: {
              ...deadline,
              originalDueDate: deadline.originalDueDate || deadline.dueDate,
              dueDate: newDueDate,
              extensionReason: reason,
              extensionApprovedBy: approvedBy,
              extensionApprovedDate: now,
              status: 'extended',
              updatedAt: now,
            },
          },
        }));

        get().syncCalendarEvents();
      },

      // =========================================================================
      // MILESTONE CRUD
      // =========================================================================

      createMilestone: (milestoneData) => {
        const id = generateSubmissionCalendarId.milestone();
        const now = new Date().toISOString();

        const milestone: SubmissionMilestone = {
          id,
          ...milestoneData,
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          milestones: { ...state.milestones, [id]: milestone },
          milestoneIndex: [...state.milestoneIndex, id],
        }));

        get().syncCalendarEvents();
        
        return id;
      },

      updateMilestone: (id, updates) => {
        const milestone = get().milestones[id];
        if (!milestone) return;

        set(state => ({
          milestones: {
            ...state.milestones,
            [id]: {
              ...milestone,
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        }));

        get().syncCalendarEvents();
      },

      deleteMilestone: (id) => {
        set(state => {
          const { [id]: _, ...remaining } = state.milestones;
          return {
            milestones: remaining,
            milestoneIndex: state.milestoneIndex.filter(mid => mid !== id),
            selectedMilestoneId: state.selectedMilestoneId === id ? null : state.selectedMilestoneId,
          };
        });

        get().syncCalendarEvents();
      },

      updateMilestoneProgress: (id, percentComplete) => {
        const milestone = get().milestones[id];
        if (!milestone) return;

        let newStatus: MilestoneStatus = milestone.status;
        
        if (percentComplete >= 100) {
          newStatus = 'completed';
        } else if (percentComplete > 0 && milestone.status === 'not-started') {
          newStatus = 'in-progress';
        }

        set(state => ({
          milestones: {
            ...state.milestones,
            [id]: {
              ...milestone,
              percentComplete: Math.min(100, Math.max(0, percentComplete)),
              status: newStatus,
              actualDate: percentComplete >= 100 ? new Date().toISOString().split('T')[0] : milestone.actualDate,
              updatedAt: new Date().toISOString(),
            },
          },
        }));

        get().syncCalendarEvents();
      },

      completeMilestone: (id) => {
        get().updateMilestoneProgress(id, 100);
      },

      // =========================================================================
      // QUERY METHODS
      // =========================================================================

      getDeadline: (id) => {
        return get().deadlines[id] || null;
      },

      getMilestone: (id) => {
        return get().milestones[id] || null;
      },

      getDeadlinesForApplication: (applicationId) => {
        const { deadlines, deadlineIndex } = get();
        return deadlineIndex
          .map(id => deadlines[id])
          .filter(d => d && d.applicationId === applicationId);
      },

      getMilestonesForApplication: (applicationId) => {
        const { milestones, milestoneIndex } = get();
        return milestoneIndex
          .map(id => milestones[id])
          .filter(m => m && m.applicationId === applicationId);
      },

      getDeadlinesByStatus: (status) => {
        const { deadlines, deadlineIndex } = get();
        return deadlineIndex
          .map(id => deadlines[id])
          .filter(d => d && d.status === status);
      },

      getUpcomingDeadlines: (days) => {
        const { deadlines, deadlineIndex } = get();
        const cutoff = addDays(new Date().toISOString().split('T')[0], days);
        
        return deadlineIndex
          .map(id => deadlines[id])
          .filter(d => {
            if (!d) return false;
            if (['completed', 'completed-late', 'cancelled', 'waived'].includes(d.status)) return false;
            return d.dueDate <= cutoff;
          })
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      },

      getOverdueDeadlines: () => {
        return get().getDeadlinesByStatus('overdue');
      },

      // =========================================================================
      // TIMELINE ESTIMATION
      // =========================================================================

      estimateTimeline: (config, _templateId) => {
        const leadTime = getLeadTimeConfig(config.region, config.submissionType) || US_NDA_LEAD_TIME;
        
        const deadlines: Omit<SubmissionDeadline, 'id' | 'createdAt' | 'updatedAt' | 'remindersSent'>[] = [];
        const milestones: Omit<SubmissionMilestone, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        const criticalPath: string[] = [];
        
        // Generate milestones from phases
        for (const phase of leadTime.phases) {
          const targetDate = addDays(config.startDate, phase.daysFromStart + phase.duration);
          
          milestones.push({
            title: phase.name,
            description: `${phase.name} phase for ${config.submissionType.toUpperCase()} submission`,
            category: phase.category,
            targetDate,
            status: 'not-started',
            percentComplete: 0,
            region: config.region,
            predecessors: phase.dependsOn || [],
            successors: [],
            assignees: [],
            tags: [config.region, config.submissionType],
          });

          // Add critical path
          if (!phase.isParallel) {
            criticalPath.push(phase.id);
          }
        }

        // Generate submission deadline
        const submissionDate = addDays(config.startDate, leadTime.totalDays);
        
        deadlines.push({
          title: `${config.submissionType.toUpperCase()} Submission Due`,
          description: `Target submission date for ${config.region} ${config.submissionType.toUpperCase()}`,
          deadlineType: 'submission-due',
          dueDate: submissionDate,
          warningDays: 14,
          status: 'pending',
          priority: 'critical',
          region: config.region,
          submissionType: config.submissionType,
          tags: [config.region, config.submissionType, 'target'],
          createdBy: 'system',
        });

        // Generate internal milestones as deadlines
        const reviewCompleteDate = addDays(config.startDate, Math.floor(leadTime.totalDays * 0.6));
        deadlines.push({
          title: 'Internal Review Complete',
          description: 'All internal reviews must be completed by this date',
          deadlineType: 'review-complete',
          dueDate: reviewCompleteDate,
          warningDays: 7,
          status: 'pending',
          priority: 'high',
          region: config.region,
          tags: ['internal', 'review'],
          createdBy: 'system',
        });

        const qcCompleteDate = addDays(config.startDate, Math.floor(leadTime.totalDays * 0.75));
        deadlines.push({
          title: 'QC Complete',
          description: 'Quality control review must be completed by this date',
          deadlineType: 'qc-complete',
          dueDate: qcCompleteDate,
          warningDays: 5,
          status: 'pending',
          priority: 'high',
          region: config.region,
          tags: ['internal', 'qc'],
          createdBy: 'system',
        });

        return {
          deadlines,
          milestones,
          estimatedSubmissionDate: submissionDate,
          totalDuration: leadTime.totalDays,
          criticalPath,
        };
      },

      applyEstimatedTimeline: (timeline, applicationId) => {
        const { createDeadline, createMilestone } = get();

        // Create deadlines
        for (const deadline of timeline.deadlines) {
          createDeadline({
            ...deadline,
            applicationId,
          });
        }

        // Create milestones
        for (const milestone of timeline.milestones) {
          createMilestone({
            ...milestone,
            applicationId,
          });
        }

        get().syncCalendarEvents();
      },

      // =========================================================================
      // CALENDAR EVENT SYNC
      // =========================================================================

      syncCalendarEvents: () => {
        const { deadlines, deadlineIndex, milestones, milestoneIndex } = get();
        const events: SubmissionCalendarEvent[] = [];
        const now = new Date().toISOString();

        // Convert deadlines to events
        for (const id of deadlineIndex) {
          const deadline = deadlines[id];
          if (!deadline) continue;

          events.push({
            id: generateSubmissionCalendarId.event(),
            title: deadline.title,
            description: deadline.description,
            eventType: 'deadline',
            startDate: deadline.dueDate,
            isAllDay: !deadline.dueTime,
            referenceId: deadline.id,
            referenceType: 'deadline',
            applicationId: deadline.applicationId,
            region: deadline.region,
            createdAt: now,
          });
        }

        // Convert milestones to events
        for (const id of milestoneIndex) {
          const milestone = milestones[id];
          if (!milestone) continue;

          events.push({
            id: generateSubmissionCalendarId.event(),
            title: milestone.title,
            description: milestone.description,
            eventType: 'milestone',
            startDate: milestone.targetDate,
            isAllDay: true,
            referenceId: milestone.id,
            referenceType: 'milestone',
            applicationId: milestone.applicationId,
            region: milestone.region,
            createdAt: now,
          });
        }

        set({ calendarEvents: events });
      },

      getEventsForDateRange: (from, to) => {
        const { calendarEvents } = get();
        return calendarEvents.filter(e => e.startDate >= from && e.startDate <= to);
      },

      getEventsForDate: (date) => {
        const { calendarEvents } = get();
        return calendarEvents.filter(e => e.startDate.startsWith(date));
      },

      // =========================================================================
      // STATISTICS
      // =========================================================================

      refreshStatistics: () => {
        const { deadlines, deadlineIndex, milestones, milestoneIndex } = get();

        const allDeadlines = deadlineIndex.map(id => deadlines[id]).filter(Boolean);
        const allMilestones = milestoneIndex.map(id => milestones[id]).filter(Boolean);

        const stats: SubmissionCalendarStatistics = {
          totalDeadlines: allDeadlines.length,
          pendingDeadlines: allDeadlines.filter(d => ['pending', 'approaching', 'due-today'].includes(d.status)).length,
          overdueDeadlines: allDeadlines.filter(d => d.status === 'overdue').length,
          completedDeadlines: allDeadlines.filter(d => ['completed', 'completed-late'].includes(d.status)).length,

          totalMilestones: allMilestones.length,
          completedMilestones: allMilestones.filter(m => m.status === 'completed').length,
          atRiskMilestones: allMilestones.filter(m => m.status === 'at-risk').length,
          delayedMilestones: allMilestones.filter(m => ['delayed', 'blocked'].includes(m.status)).length,

          upcomingNext7Days: get().getUpcomingDeadlines(7).length,
          upcomingNext30Days: get().getUpcomingDeadlines(30).length,
          upcomingNext90Days: get().getUpcomingDeadlines(90).length,

          byRegion: {} as Record<RegulatoryRegion, number>,
          byPriority: {
            critical: allDeadlines.filter(d => d.priority === 'critical').length,
            high: allDeadlines.filter(d => d.priority === 'high').length,
            medium: allDeadlines.filter(d => d.priority === 'medium').length,
            low: allDeadlines.filter(d => d.priority === 'low').length,
          },
        };

        // Count by region
        for (const deadline of allDeadlines) {
          stats.byRegion[deadline.region] = (stats.byRegion[deadline.region] || 0) + 1;
        }

        set({ statistics: stats });
        return stats;
      },

      // =========================================================================
      // UI ACTIONS
      // =========================================================================

      setActiveView: (view) => {
        set({ activeView: view });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setCurrentMonth: (month) => {
        set({ currentMonth: month });
      },

      navigateMonth: (direction) => {
        const { currentMonth } = get();
        const [year, month] = currentMonth.split('-').map(Number);
        
        let newMonth: number;
        let newYear: number;
        
        if (direction === 'next') {
          newMonth = month === 12 ? 1 : month + 1;
          newYear = month === 12 ? year + 1 : year;
        } else {
          newMonth = month === 1 ? 12 : month - 1;
          newYear = month === 1 ? year - 1 : year;
        }

        set({ currentMonth: `${newYear}-${String(newMonth).padStart(2, '0')}` });
      },

      goToToday: () => {
        set({ 
          currentMonth: getCurrentMonth(),
          selectedDate: new Date().toISOString().split('T')[0],
        });
      },

      selectDate: (date) => {
        set({ selectedDate: date });
      },

      selectDeadline: (id) => {
        set({ selectedDeadlineId: id });
      },

      selectMilestone: (id) => {
        set({ selectedMilestoneId: id });
      },

      setFilters: (filters) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({ filters: { ...DEFAULT_CALENDAR_FILTERS } });
      },

      // =========================================================================
      // RESET
      // =========================================================================

      reset: () => set(initialState),
    }),
    { name: 'submission-calendar-store' }
  )
);

// =============================================================================
// SELECTORS
// =============================================================================

export const useSelectedDeadline = () => {
  const selectedId = useSubmissionCalendarStore(s => s.selectedDeadlineId);
  const deadlines = useSubmissionCalendarStore(s => s.deadlines);
  return selectedId ? deadlines[selectedId] : null;
};

export const useSelectedMilestone = () => {
  const selectedId = useSubmissionCalendarStore(s => s.selectedMilestoneId);
  const milestones = useSubmissionCalendarStore(s => s.milestones);
  return selectedId ? milestones[selectedId] : null;
};

export const useDeadlineList = () => {
  const deadlines = useSubmissionCalendarStore(s => s.deadlines);
  const index = useSubmissionCalendarStore(s => s.deadlineIndex);
  return useMemo(() => index.map(id => deadlines[id]).filter(Boolean), [deadlines, index]);
};

export const useMilestoneList = () => {
  const milestones = useSubmissionCalendarStore(s => s.milestones);
  const index = useSubmissionCalendarStore(s => s.milestoneIndex);
  return useMemo(() => index.map(id => milestones[id]).filter(Boolean), [milestones, index]);
};

export const useCalendarEvents = () => {
  return useSubmissionCalendarStore(s => s.calendarEvents);
};

export const useCalendarStatistics = () => {
  return useSubmissionCalendarStore(s => s.statistics);
};

export const useActiveCalendarView = () => {
  return useSubmissionCalendarStore(s => s.activeView);
};

export const useCalendarViewMode = () => {
  return useSubmissionCalendarStore(s => s.viewMode);
};

export const useCalendarFilters = () => {
  return useSubmissionCalendarStore(s => s.filters);
};

export const useCurrentCalendarMonth = () => {
  return useSubmissionCalendarStore(s => s.currentMonth);
};

export const useUpcomingDeadlines = (days: number) => {
  const deadlines = useSubmissionCalendarStore(s => s.deadlines);
  const index = useSubmissionCalendarStore(s => s.deadlineIndex);
  
  return useMemo(() => {
    const cutoff = addDays(new Date().toISOString().split('T')[0], days);
    return index
      .map(id => deadlines[id])
      .filter(d => {
        if (!d) return false;
        if (['completed', 'completed-late', 'cancelled', 'waived'].includes(d.status)) return false;
        return d.dueDate <= cutoff;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [deadlines, index, days]);
};

export const useOverdueDeadlines = () => {
  const deadlines = useSubmissionCalendarStore(s => s.deadlines);
  const index = useSubmissionCalendarStore(s => s.deadlineIndex);
  
  return useMemo(() => {
    return index
      .map(id => deadlines[id])
      .filter(d => d && d.status === 'overdue');
  }, [deadlines, index]);
};

export const useDeadlinesForApplication = (applicationId: string) => {
  const deadlines = useSubmissionCalendarStore(s => s.deadlines);
  const index = useSubmissionCalendarStore(s => s.deadlineIndex);
  
  return useMemo(() => {
    return index
      .map(id => deadlines[id])
      .filter(d => d && d.applicationId === applicationId);
  }, [deadlines, index, applicationId]);
};

export const useMilestonesForApplication = (applicationId: string) => {
  const milestones = useSubmissionCalendarStore(s => s.milestones);
  const index = useSubmissionCalendarStore(s => s.milestoneIndex);
  
  return useMemo(() => {
    return index
      .map(id => milestones[id])
      .filter(m => m && m.applicationId === applicationId);
  }, [milestones, index, applicationId]);
};
