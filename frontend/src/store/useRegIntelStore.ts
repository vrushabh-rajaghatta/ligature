

// ============================================================================
// Regulatory Intelligence Store - v56
// Real-time regulatory guidance monitoring, agency document tracking,
// compliance deadline management, and impact assessment
// ============================================================================

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  RegulatoryAgencyId,
  GuidanceDocument,
  GuidanceDocumentChange,
  GuidanceDocumentType,
  GuidanceStatus,
  TherapeuticArea,
  RegulatoryTopic,
  RegulatoryAlert,
  AlertSeverity,
  AlertCategory,
  MonitoringSubscription,
  ComplianceDeadline,
  DeadlineExtensionRequest,
  DeadlinePriority,
  ImpactAssessment,
  ImpactLevel,
  ProgramImpact,
  SubmissionImpact,
  CategoryImpact,
  ComplianceGap,
  RecommendedAction,
  RegulatoryFeed,
  FeedItem,
  RegionalComparison,
  RegulatoryCalendarEvent,
  RegIntelDashboard,
  GuidanceSearchQuery,
  GuidanceSearchResult,
  RegIntelView,
  RegIntelFilters,
  RegIntelState,
  RegIntelActions,
} from './regIntelTypes';

// ============================================================================
// UTILITIES
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

const DEFAULT_FILTERS: RegIntelFilters = {
  agencies: [],
  documentTypes: [],
  topics: [],
  therapeuticAreas: [],
  alertSeverities: [],
  deadlinePriorities: [],
  searchText: '',
  showResolved: false,
  showDismissed: false,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useRegIntelStore = create<RegIntelState & RegIntelActions>()(
  persist(
    (set, get) => ({
      // ========================================================================
      // INITIAL STATE
      // ========================================================================
      
      guidanceDocuments: [],
      documentChanges: [],
      alerts: [],
      deadlines: [],
      extensionRequests: [],
      impactAssessments: [],
      complianceGaps: [],
      recommendedActions: [],
      subscriptions: [],
      feeds: [],
      feedItems: [],
      regionalComparisons: [],
      calendarEvents: [],
      
      selectedDocumentId: null,
      selectedAlertId: null,
      selectedDeadlineId: null,
      selectedAssessmentId: null,
      selectedComparisonId: null,
      
      activeView: 'dashboard',
      filters: { ...DEFAULT_FILTERS },
      isLoading: false,
      error: null,
      
      dashboardData: null,
      dashboardLastUpdated: null,
      
      // ========================================================================
      // GUIDANCE DOCUMENTS
      // ========================================================================
      
      addGuidanceDocument: (doc) => {
        const id = generateId('guidance');
        const now = timestamp();
        
        set((state) => ({
          guidanceDocuments: [
            ...state.guidanceDocuments,
            {
              ...doc,
              id,
              addedToSystemDate: now,
              lastUpdatedInSystem: now,
            },
          ],
        }));
        
        return id;
      },
      
      updateGuidanceDocument: (id, updates) => {
        set((state) => ({
          guidanceDocuments: state.guidanceDocuments.map((doc) =>
            doc.id === id
              ? { ...doc, ...updates, lastUpdatedInSystem: timestamp() }
              : doc
          ),
        }));
      },
      
      deleteGuidanceDocument: (id) => {
        set((state) => ({
          guidanceDocuments: state.guidanceDocuments.filter((d) => d.id !== id),
          selectedDocumentId: state.selectedDocumentId === id ? null : state.selectedDocumentId,
        }));
      },
      
      recordDocumentChange: (change) => {
        const id = generateId('change');
        
        set((state) => ({
          documentChanges: [
            ...state.documentChanges,
            { ...change, id },
          ],
        }));
        
        return id;
      },
      
      searchGuidance: (query) => {
        const { guidanceDocuments } = get();
        
        let filtered = [...guidanceDocuments];
        
        // Text search
        if (query.searchText) {
          const searchLower = query.searchText.toLowerCase();
          filtered = filtered.filter(
            (doc) =>
              doc.title.toLowerCase().includes(searchLower) ||
              doc.summary.toLowerCase().includes(searchLower) ||
              doc.documentNumber.toLowerCase().includes(searchLower) ||
              doc.keywords.some((k) => k.toLowerCase().includes(searchLower))
          );
        }
        
        // Agency filter
        if (query.agencies && query.agencies.length > 0) {
          filtered = filtered.filter((doc) => query.agencies!.includes(doc.issuingAgency));
        }
        
        // Document type filter
        if (query.documentTypes && query.documentTypes.length > 0) {
          filtered = filtered.filter((doc) => query.documentTypes!.includes(doc.documentType));
        }
        
        // Status filter
        if (query.statuses && query.statuses.length > 0) {
          filtered = filtered.filter((doc) => query.statuses!.includes(doc.status));
        }
        
        // Therapeutic area filter
        if (query.therapeuticAreas && query.therapeuticAreas.length > 0) {
          filtered = filtered.filter((doc) =>
            doc.therapeuticAreas.some((ta) => query.therapeuticAreas!.includes(ta))
          );
        }
        
        // Topic filter
        if (query.topics && query.topics.length > 0) {
          filtered = filtered.filter((doc) =>
            doc.topics.some((t) => query.topics!.includes(t))
          );
        }
        
        // Date range filter
        if (query.dateFrom) {
          filtered = filtered.filter((doc) => doc.issuedDate >= query.dateFrom!);
        }
        if (query.dateTo) {
          filtered = filtered.filter((doc) => doc.issuedDate <= query.dateTo!);
        }
        
        // Build facets
        const facets = {
          agencies: buildFacet(filtered, 'issuingAgency') as { value: RegulatoryAgencyId; count: number }[],
          types: buildFacet(filtered, 'documentType') as { value: GuidanceDocumentType; count: number }[],
          statuses: buildFacet(filtered, 'status') as { value: GuidanceStatus; count: number }[],
          topics: buildArrayFacet(filtered, 'topics') as { value: RegulatoryTopic; count: number }[],
        };
        
        return {
          documents: filtered,
          totalCount: filtered.length,
          facets,
        };
      },
      
      // ========================================================================
      // ALERTS
      // ========================================================================
      
      createAlert: (alert) => {
        const id = generateId('alert');
        const now = timestamp();
        
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id,
              status: 'new',
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        
        return id;
      },
      
      updateAlert: (id, updates) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? { ...alert, ...updates, updatedAt: timestamp() }
              : alert
          ),
        }));
      },
      
      acknowledgeAlert: (id, userId) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  status: 'acknowledged',
                  acknowledgedBy: userId,
                  acknowledgedDate: timestamp(),
                  updatedAt: timestamp(),
                }
              : alert
          ),
        }));
      },
      
      resolveAlert: (id, userId, notes) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  status: 'resolved',
                  resolvedBy: userId,
                  resolvedDate: timestamp(),
                  resolutionNotes: notes,
                  updatedAt: timestamp(),
                }
              : alert
          ),
        }));
      },
      
      dismissAlert: (id, userId, reason) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  status: 'dismissed',
                  resolvedBy: userId,
                  resolvedDate: timestamp(),
                  resolutionNotes: reason,
                  updatedAt: timestamp(),
                }
              : alert
          ),
        }));
      },
      
      // ========================================================================
      // DEADLINES
      // ========================================================================
      
      createDeadline: (deadline) => {
        const id = generateId('deadline');
        const now = timestamp();
        
        // Determine initial status based on due date
        const dueDate = new Date(deadline.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: ComplianceDeadline['status'] = 'upcoming';
        if (daysUntilDue < 0) status = 'overdue';
        else if (daysUntilDue <= 30) status = 'due-soon';
        
        set((state) => ({
          deadlines: [
            ...state.deadlines,
            {
              ...deadline,
              id,
              status,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        
        return id;
      },
      
      updateDeadline: (id, updates) => {
        set((state) => ({
          deadlines: state.deadlines.map((dl) =>
            dl.id === id
              ? { ...dl, ...updates, updatedAt: timestamp() }
              : dl
          ),
        }));
      },
      
      completeDeadline: (id, completedBy, documents) => {
        set((state) => ({
          deadlines: state.deadlines.map((dl) =>
            dl.id === id
              ? {
                  ...dl,
                  status: 'completed',
                  completedDate: timestamp(),
                  completionDocuments: documents,
                  notes: `Completed by ${completedBy}`,
                  updatedAt: timestamp(),
                }
              : dl
          ),
        }));
      },
      
      requestExtension: (request) => {
        const id = generateId('ext-req');
        
        set((state) => ({
          extensionRequests: [
            ...state.extensionRequests,
            {
              ...request,
              id,
              status: 'pending',
              createdAt: timestamp(),
            },
          ],
          deadlines: state.deadlines.map((dl) =>
            dl.id === request.deadlineId
              ? { ...dl, status: 'extension-requested', updatedAt: timestamp() }
              : dl
          ),
        }));
        
        return id;
      },
      
      processExtensionRequest: (requestId, approved, reviewerId, response) => {
        const request = get().extensionRequests.find((r) => r.id === requestId);
        if (!request) return;
        
        set((state) => ({
          extensionRequests: state.extensionRequests.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  status: approved ? 'approved' : 'denied',
                  reviewedBy: reviewerId,
                  reviewedDate: timestamp(),
                  agencyResponse: response,
                }
              : r
          ),
          deadlines: state.deadlines.map((dl) =>
            dl.id === request.deadlineId
              ? {
                  ...dl,
                  status: approved ? 'upcoming' : 'due-soon',
                  dueDate: approved ? request.newProposedDate : dl.dueDate,
                  extensionDate: approved ? request.newProposedDate : undefined,
                  updatedAt: timestamp(),
                }
              : dl
          ),
        }));
      },
      
      // ========================================================================
      // IMPACT ASSESSMENTS
      // ========================================================================
      
      createImpactAssessment: (triggerId, triggerType, triggerTitle, assessedBy) => {
        const id = generateId('impact');
        const now = timestamp();
        
        set((state) => ({
          impactAssessments: [
            ...state.impactAssessments,
            {
              id,
              triggerId,
              triggerType,
              triggerTitle,
              affectedPrograms: [],
              affectedSubmissions: [],
              overallImpactLevel: 'moderate',
              overallSummary: '',
              categoryImpacts: [],
              complianceGaps: [],
              recommendedActions: [],
              assessmentDate: now,
              assessedBy,
              status: 'draft',
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        
        return id;
      },
      
      updateImpactAssessment: (id, updates) => {
        set((state) => ({
          impactAssessments: state.impactAssessments.map((ia) =>
            ia.id === id
              ? { ...ia, ...updates, updatedAt: timestamp() }
              : ia
          ),
        }));
      },
      
      addProgramImpact: (assessmentId, impact) => {
        set((state) => ({
          impactAssessments: state.impactAssessments.map((ia) =>
            ia.id === assessmentId
              ? {
                  ...ia,
                  affectedPrograms: [...ia.affectedPrograms, impact],
                  updatedAt: timestamp(),
                }
              : ia
          ),
        }));
      },
      
      addSubmissionImpact: (assessmentId, impact) => {
        set((state) => ({
          impactAssessments: state.impactAssessments.map((ia) =>
            ia.id === assessmentId
              ? {
                  ...ia,
                  affectedSubmissions: [...ia.affectedSubmissions, impact],
                  updatedAt: timestamp(),
                }
              : ia
          ),
        }));
      },
      
      addCategoryImpact: (assessmentId, impact) => {
        set((state) => ({
          impactAssessments: state.impactAssessments.map((ia) =>
            ia.id === assessmentId
              ? {
                  ...ia,
                  categoryImpacts: [...ia.categoryImpacts, impact],
                  updatedAt: timestamp(),
                }
              : ia
          ),
        }));
      },
      
      addComplianceGap: (gap) => {
        const id = generateId('gap');
        
        set((state) => ({
          complianceGaps: [
            ...state.complianceGaps,
            { ...gap, id, status: 'identified' },
          ],
        }));
        
        return id;
      },
      
      updateComplianceGap: (id, updates) => {
        set((state) => ({
          complianceGaps: state.complianceGaps.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }));
      },
      
      addRecommendedAction: (action) => {
        const id = generateId('action');
        
        set((state) => ({
          recommendedActions: [
            ...state.recommendedActions,
            { ...action, id, status: 'proposed' },
          ],
        }));
        
        return id;
      },
      
      updateRecommendedAction: (id, updates) => {
        set((state) => ({
          recommendedActions: state.recommendedActions.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
      },
      
      submitAssessmentForReview: (id, reviewerId) => {
        set((state) => ({
          impactAssessments: state.impactAssessments.map((ia) =>
            ia.id === id
              ? {
                  ...ia,
                  status: 'under-review',
                  reviewedBy: reviewerId,
                  updatedAt: timestamp(),
                }
              : ia
          ),
        }));
      },
      
      approveAssessment: (id, approverId) => {
        set((state) => ({
          impactAssessments: state.impactAssessments.map((ia) =>
            ia.id === id
              ? {
                  ...ia,
                  status: 'approved',
                  approvedBy: approverId,
                  approvedDate: timestamp(),
                  updatedAt: timestamp(),
                }
              : ia
          ),
        }));
      },
      
      // ========================================================================
      // SUBSCRIPTIONS
      // ========================================================================
      
      createSubscription: (sub) => {
        const id = generateId('sub');
        const now = timestamp();
        
        set((state) => ({
          subscriptions: [
            ...state.subscriptions,
            { ...sub, id, createdAt: now, updatedAt: now },
          ],
        }));
        
        return id;
      },
      
      updateSubscription: (id, updates) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id
              ? { ...s, ...updates, updatedAt: timestamp() }
              : s
          ),
        }));
      },
      
      deleteSubscription: (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
        }));
      },
      
      // ========================================================================
      // FEEDS
      // ========================================================================
      
      addFeed: (feed) => {
        const id = generateId('feed');
        const now = timestamp();
        
        set((state) => ({
          feeds: [
            ...state.feeds,
            { ...feed, id, itemsProcessed: 0, createdAt: now, updatedAt: now },
          ],
        }));
        
        return id;
      },
      
      updateFeed: (id, updates) => {
        set((state) => ({
          feeds: state.feeds.map((f) =>
            f.id === id
              ? { ...f, ...updates, updatedAt: timestamp() }
              : f
          ),
        }));
      },
      
      processFeedItem: (item) => {
        const id = generateId('feed-item');
        
        set((state) => ({
          feedItems: [
            ...state.feedItems,
            { ...item, id, processedDate: timestamp(), dismissed: false },
          ],
          feeds: state.feeds.map((f) =>
            f.id === item.feedId
              ? { ...f, itemsProcessed: f.itemsProcessed + 1, lastFetchDate: timestamp() }
              : f
          ),
        }));
        
        return id;
      },
      
      dismissFeedItem: (id, userId, reason) => {
        set((state) => ({
          feedItems: state.feedItems.map((fi) =>
            fi.id === id
              ? { ...fi, dismissed: true, dismissedBy: userId, dismissedReason: reason }
              : fi
          ),
        }));
      },
      
      convertFeedItemToDocument: (itemId, doc) => {
        const docId = get().addGuidanceDocument(doc);
        
        set((state) => ({
          feedItems: state.feedItems.map((fi) =>
            fi.id === itemId
              ? { ...fi, convertedToDocumentId: docId }
              : fi
          ),
        }));
        
        return docId;
      },
      
      convertFeedItemToAlert: (itemId, alert) => {
        const alertId = get().createAlert(alert);
        
        set((state) => ({
          feedItems: state.feedItems.map((fi) =>
            fi.id === itemId
              ? { ...fi, convertedToAlertId: alertId }
              : fi
          ),
        }));
        
        return alertId;
      },
      
      // ========================================================================
      // REGIONAL COMPARISONS
      // ========================================================================
      
      createComparison: (comparison) => {
        const id = generateId('comparison');
        const now = timestamp();
        
        set((state) => ({
          regionalComparisons: [
            ...state.regionalComparisons,
            { ...comparison, id, createdAt: now, updatedAt: now },
          ],
        }));
        
        return id;
      },
      
      updateComparison: (id, updates) => {
        set((state) => ({
          regionalComparisons: state.regionalComparisons.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: timestamp() }
              : c
          ),
        }));
      },
      
      deleteComparison: (id) => {
        set((state) => ({
          regionalComparisons: state.regionalComparisons.filter((c) => c.id !== id),
          selectedComparisonId: state.selectedComparisonId === id ? null : state.selectedComparisonId,
        }));
      },
      
      // ========================================================================
      // CALENDAR
      // ========================================================================
      
      createCalendarEvent: (event) => {
        const id = generateId('cal-event');
        const now = timestamp();
        
        set((state) => ({
          calendarEvents: [
            ...state.calendarEvents,
            { ...event, id, status: 'scheduled', createdAt: now, updatedAt: now },
          ],
        }));
        
        return id;
      },
      
      updateCalendarEvent: (id, updates) => {
        set((state) => ({
          calendarEvents: state.calendarEvents.map((e) =>
            e.id === id
              ? { ...e, ...updates, updatedAt: timestamp() }
              : e
          ),
        }));
      },
      
      deleteCalendarEvent: (id) => {
        set((state) => ({
          calendarEvents: state.calendarEvents.filter((e) => e.id !== id),
        }));
      },
      
      syncDeadlineToCalendar: (deadlineId) => {
        const deadline = get().deadlines.find((d) => d.id === deadlineId);
        if (!deadline) return '';
        
        const eventId = get().createCalendarEvent({
          title: deadline.title,
          description: deadline.description,
          eventType: 'deadline',
          startDate: deadline.dueDate,
          allDay: true,
          agency: deadline.agency,
          sourceDeadlineId: deadlineId,
          programIds: deadline.programId ? [deadline.programId] : undefined,
          assignedTo: [deadline.assignedTo],
          isRecurring: false,
          reminders: deadline.reminderDays.map((days, idx) => ({
            id: `rem-${idx}`,
            eventId: '', // Will be set after creation
            reminderType: 'both',
            triggerMinutesBefore: days * 24 * 60,
            sent: false,
          })),
        });
        
        return eventId;
      },
      
      // ========================================================================
      // DASHBOARD
      // ========================================================================
      
      refreshDashboard: () => {
        const state = get();
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Count active alerts
        const activeAlerts = state.alerts.filter(
          (a) => !['resolved', 'dismissed'].includes(a.status)
        );
        const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical');
        
        // Alert breakdowns
        const alertsByCategory = buildCountMap(activeAlerts, 'category') as { category: AlertCategory; count: number }[];
        const alertsBySeverity = buildCountMap(activeAlerts, 'severity') as { severity: AlertSeverity; count: number }[];
        
        // Deadlines
        const nonCompletedDeadlines = state.deadlines.filter(
          (d) => !['completed', 'waived', 'cancelled'].includes(d.status)
        );
        const upcomingDeadlines = nonCompletedDeadlines.length;
        const overdueDeadlines = nonCompletedDeadlines.filter((d) => d.status === 'overdue').length;
        const deadlinesNext30Days = nonCompletedDeadlines.filter(
          (d) => new Date(d.dueDate) <= thirtyDaysFromNow
        );
        const deadlinesByPriority = buildCountMap(nonCompletedDeadlines, 'priority') as { priority: DeadlinePriority; count: number }[];
        
        // Impact assessments
        const pendingAssessments = state.impactAssessments.filter((ia) => ia.status === 'draft').length;
        const assessmentsInProgress = state.impactAssessments.filter(
          (ia) => ['under-review', 'action-in-progress'].includes(ia.status)
        ).length;
        const openComplianceGaps = state.complianceGaps.filter(
          (g) => !['resolved', 'accepted-risk'].includes(g.status)
        ).length;
        
        // Document stats
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const documentsAddedThisMonth = state.guidanceDocuments.filter(
          (d) => d.addedToSystemDate >= thisMonth
        ).length;
        const documentsUpdatedThisMonth = state.guidanceDocuments.filter(
          (d) => d.lastUpdatedInSystem >= thisMonth && d.addedToSystemDate < thisMonth
        ).length;
        
        // By agency breakdowns
        const documentsByAgency = buildCountMap(state.guidanceDocuments, 'issuingAgency') as { agency: RegulatoryAgencyId; count: number }[];
        const alertsByAgency = buildCountMap(activeAlerts, 'sourceAgency') as { agency: RegulatoryAgencyId; count: number }[];
        
        // Recent items (last 10)
        const recentDocuments = [...state.guidanceDocuments]
          .sort((a, b) => b.addedToSystemDate.localeCompare(a.addedToSystemDate))
          .slice(0, 10);
        const recentAlerts = [...activeAlerts]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 10);
        const recentChanges = [...state.documentChanges]
          .sort((a, b) => b.changeDate.localeCompare(a.changeDate))
          .slice(0, 10);
        
        // Feed health
        const activeFeedsCount = state.feeds.filter((f) => f.isActive).length;
        const feedsWithErrors = state.feeds.filter((f) => f.lastErrorDate && (!f.lastSuccessDate || f.lastErrorDate > f.lastSuccessDate)).length;
        const lastFeedUpdate = state.feeds
          .map((f) => f.lastFetchDate)
          .filter(Boolean)
          .sort()
          .pop();
        
        // Quick actions
        const quickActions = [];
        if (criticalAlerts.length > 0) {
          quickActions.push({
            id: 'qa-critical',
            label: 'Review Critical Alerts',
            description: `${criticalAlerts.length} critical alert(s) require attention`,
            actionType: 'view' as const,
            targetType: 'alert' as const,
            priority: 'critical' as const,
          });
        }
        if (overdueDeadlines > 0) {
          quickActions.push({
            id: 'qa-overdue',
            label: 'Address Overdue Deadlines',
            description: `${overdueDeadlines} deadline(s) are overdue`,
            actionType: 'view' as const,
            targetType: 'deadline' as const,
            priority: 'high' as const,
          });
        }
        if (pendingAssessments > 0) {
          quickActions.push({
            id: 'qa-assess',
            label: 'Complete Pending Assessments',
            description: `${pendingAssessments} impact assessment(s) in draft`,
            actionType: 'assess' as const,
            targetType: 'assessment' as const,
            priority: 'medium' as const,
          });
        }
        
        const dashboard: RegIntelDashboard = {
          totalGuidanceDocuments: state.guidanceDocuments.length,
          documentsAddedThisMonth,
          documentsUpdatedThisMonth,
          activeAlerts: activeAlerts.length,
          criticalAlerts: criticalAlerts.length,
          alertsByCategory,
          alertsBySeverity,
          upcomingDeadlines,
          overdueDeadlines,
          deadlinesNext30Days,
          deadlinesByPriority,
          pendingAssessments,
          assessmentsInProgress,
          openComplianceGaps,
          documentsByAgency,
          alertsByAgency,
          recentDocuments,
          recentAlerts,
          recentChanges,
          activeFeedsCount,
          feedsWithErrors,
          lastFeedUpdate,
          quickActions,
        };
        
        set({
          dashboardData: dashboard,
          dashboardLastUpdated: timestamp(),
        });
        
        return dashboard;
      },
      
      // ========================================================================
      // UI ACTIONS
      // ========================================================================
      
      setActiveView: (view) => {
        set({ activeView: view });
      },
      
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },
      
      resetFilters: () => {
        set({ filters: { ...DEFAULT_FILTERS } });
      },
      
      selectDocument: (id) => {
        set({ selectedDocumentId: id });
      },
      
      selectAlert: (id) => {
        set({ selectedAlertId: id });
      },
      
      selectDeadline: (id) => {
        set({ selectedDeadlineId: id });
      },
      
      selectAssessment: (id) => {
        set({ selectedAssessmentId: id });
      },
      
      selectComparison: (id) => {
        set({ selectedComparisonId: id });
      },
      
      // ========================================================================
      // DATA LOADING
      // ========================================================================
      
      loadRegIntelData: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Simulate async load - in production this would fetch from API
          await new Promise((resolve) => setTimeout(resolve, 100));
          
          // Refresh dashboard after load
          get().refreshDashboard();
          
          set({ isLoading: false });
        } catch (err) {
          set({ isLoading: false, error: 'Failed to load regulatory intelligence data' });
        }
      },
      
      // ========================================================================
      // CLEAR
      // ========================================================================
      
      clearAll: () => {
        set({
          guidanceDocuments: [],
          documentChanges: [],
          alerts: [],
          deadlines: [],
          extensionRequests: [],
          impactAssessments: [],
          complianceGaps: [],
          recommendedActions: [],
          subscriptions: [],
          feeds: [],
          feedItems: [],
          regionalComparisons: [],
          calendarEvents: [],
          selectedDocumentId: null,
          selectedAlertId: null,
          selectedDeadlineId: null,
          selectedAssessmentId: null,
          selectedComparisonId: null,
          activeView: 'dashboard',
          filters: { ...DEFAULT_FILTERS },
          isLoading: false,
          error: null,
          dashboardData: null,
          dashboardLastUpdated: null,
        });
      },
    }),
    {
      name: 'ligature-regintel-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        guidanceDocuments: state.guidanceDocuments,
        documentChanges: state.documentChanges,
        alerts: state.alerts,
        deadlines: state.deadlines,
        extensionRequests: state.extensionRequests,
        impactAssessments: state.impactAssessments,
        complianceGaps: state.complianceGaps,
        recommendedActions: state.recommendedActions,
        subscriptions: state.subscriptions,
        feeds: state.feeds,
        feedItems: state.feedItems,
        regionalComparisons: state.regionalComparisons,
        calendarEvents: state.calendarEvents,
      }),
    }
  )
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildFacet<T>(items: T[], field: keyof T): { value: unknown; count: number }[] {
  const counts = new Map<unknown, number>();
  for (const item of items) {
    const value = item[field];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
}

function buildArrayFacet<T>(items: T[], field: keyof T): { value: unknown; count: number }[] {
  const counts = new Map<unknown, number>();
  for (const item of items) {
    const values = item[field] as unknown[];
    if (Array.isArray(values)) {
      for (const value of values) {
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
  }
  return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
}

function buildCountMap<T>(items: T[], field: keyof T): { [key: string]: unknown; count: number }[] {
  const counts = new Map<unknown, number>();
  for (const item of items) {
    const value = item[field];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([value, count]) => ({ [field as string]: value, count }));
}

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

// Stable selectors - return direct state references
export const useGuidanceDocuments = () => useRegIntelStore((s) => s.guidanceDocuments);
export const useRegulatoryAlerts = () => useRegIntelStore((s) => s.alerts);
export const useComplianceDeadlines = () => useRegIntelStore((s) => s.deadlines);
export const useImpactAssessments = () => useRegIntelStore((s) => s.impactAssessments);
export const useComplianceGaps = () => useRegIntelStore((s) => s.complianceGaps);
export const useRecommendedActions = () => useRegIntelStore((s) => s.recommendedActions);
export const useMonitoringSubscriptions = () => useRegIntelStore((s) => s.subscriptions);
export const useRegulatoryFeeds = () => useRegIntelStore((s) => s.feeds);
export const useFeedItems = () => useRegIntelStore((s) => s.feedItems);
export const useRegionalComparisons = () => useRegIntelStore((s) => s.regionalComparisons);
export const useCalendarEvents = () => useRegIntelStore((s) => s.calendarEvents);
export const useRegIntelDashboard = () => useRegIntelStore((s) => s.dashboardData);
export const useRegIntelFilters = () => useRegIntelStore((s) => s.filters);
export const useRegIntelView = () => useRegIntelStore((s) => s.activeView);
export const useRegIntelLoading = () => useRegIntelStore((s) => s.isLoading);
export const useRegIntelError = () => useRegIntelStore((s) => s.error);

// Derived selectors - use useMemo for stable references

export const useSelectedDocument = () => {
  const documents = useRegIntelStore((s) => s.guidanceDocuments);
  const selectedId = useRegIntelStore((s) => s.selectedDocumentId);
  return useMemo(
    () => documents.find((d) => d.id === selectedId) || null,
    [documents, selectedId]
  );
};

export const useActiveAlerts = () => {
  const alerts = useRegIntelStore((s) => s.alerts);
  return useMemo(
    () => alerts.filter((a) => !['resolved', 'dismissed'].includes(a.status)),
    [alerts]
  );
};

export const useCriticalAlerts = () => {
  const alerts = useRegIntelStore((s) => s.alerts);
  return useMemo(
    () => alerts.filter((a) => a.severity === 'critical' && !['resolved', 'dismissed'].includes(a.status)),
    [alerts]
  );
};

export const useSelectedAlert = () => {
  const alerts = useRegIntelStore((s) => s.alerts);
  const selectedId = useRegIntelStore((s) => s.selectedAlertId);
  return useMemo(
    () => alerts.find((a) => a.id === selectedId) || null,
    [alerts, selectedId]
  );
};

export const useUpcomingDeadlines = () => {
  const deadlines = useRegIntelStore((s) => s.deadlines);
  return useMemo(
    () => deadlines.filter((d) => !['completed', 'waived', 'cancelled'].includes(d.status)),
    [deadlines]
  );
};

export const useOverdueDeadlines = () => {
  const deadlines = useRegIntelStore((s) => s.deadlines);
  return useMemo(
    () => deadlines.filter((d) => d.status === 'overdue'),
    [deadlines]
  );
};

export const useSelectedDeadline = () => {
  const deadlines = useRegIntelStore((s) => s.deadlines);
  const selectedId = useRegIntelStore((s) => s.selectedDeadlineId);
  return useMemo(
    () => deadlines.find((d) => d.id === selectedId) || null,
    [deadlines, selectedId]
  );
};

export const useDeadlinesByProgram = (programId: string) => {
  const deadlines = useRegIntelStore((s) => s.deadlines);
  return useMemo(
    () => deadlines.filter((d) => d.programId === programId),
    [deadlines, programId]
  );
};

export const useSelectedAssessment = () => {
  const assessments = useRegIntelStore((s) => s.impactAssessments);
  const selectedId = useRegIntelStore((s) => s.selectedAssessmentId);
  return useMemo(
    () => assessments.find((ia) => ia.id === selectedId) || null,
    [assessments, selectedId]
  );
};

export const usePendingAssessments = () => {
  const assessments = useRegIntelStore((s) => s.impactAssessments);
  return useMemo(
    () => assessments.filter((ia) => ia.status === 'draft'),
    [assessments]
  );
};

export const useOpenGaps = () => {
  const gaps = useRegIntelStore((s) => s.complianceGaps);
  return useMemo(
    () => gaps.filter((g) => !['resolved', 'accepted-risk'].includes(g.status)),
    [gaps]
  );
};

export const useGapsByAssessment = (assessmentId: string) => {
  const gaps = useRegIntelStore((s) => s.complianceGaps);
  return useMemo(
    () => gaps.filter((g) => g.assessmentId === assessmentId),
    [gaps, assessmentId]
  );
};

export const useActionsByAssessment = (assessmentId: string) => {
  const actions = useRegIntelStore((s) => s.recommendedActions);
  return useMemo(
    () => actions.filter((a) => a.assessmentId === assessmentId),
    [actions, assessmentId]
  );
};

export const usePendingActions = () => {
  const actions = useRegIntelStore((s) => s.recommendedActions);
  return useMemo(
    () => actions.filter((a) => ['proposed', 'accepted', 'in-progress'].includes(a.status)),
    [actions]
  );
};

export const useActiveSubscriptions = () => {
  const subscriptions = useRegIntelStore((s) => s.subscriptions);
  return useMemo(
    () => subscriptions.filter((sub) => sub.isActive),
    [subscriptions]
  );
};

export const useActiveFeeds = () => {
  const feeds = useRegIntelStore((s) => s.feeds);
  return useMemo(
    () => feeds.filter((f) => f.isActive),
    [feeds]
  );
};

export const useUnprocessedFeedItems = () => {
  const feedItems = useRegIntelStore((s) => s.feedItems);
  return useMemo(
    () => feedItems.filter((fi) => !fi.dismissed && !fi.convertedToDocumentId && !fi.convertedToAlertId),
    [feedItems]
  );
};

export const useSelectedComparison = () => {
  const comparisons = useRegIntelStore((s) => s.regionalComparisons);
  const selectedId = useRegIntelStore((s) => s.selectedComparisonId);
  return useMemo(
    () => comparisons.find((c) => c.id === selectedId) || null,
    [comparisons, selectedId]
  );
};

export const useUpcomingEvents = (days: number = 30) => {
  const events = useRegIntelStore((s) => s.calendarEvents);
  return useMemo(() => {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    return events.filter((e) => e.startDate <= cutoff && e.status !== 'cancelled');
  }, [events, days]);
};

// Filtered documents based on current filters
export const useFilteredDocuments = () => {
  const documents = useRegIntelStore((s) => s.guidanceDocuments);
  const filters = useRegIntelStore((s) => s.filters);
  
  return useMemo(() => {
    let docs = documents;
    const f = filters;
    
    if (f.agencies.length > 0) {
      docs = docs.filter((d) => f.agencies.includes(d.issuingAgency));
    }
    if (f.documentTypes.length > 0) {
      docs = docs.filter((d) => f.documentTypes.includes(d.documentType));
    }
    if (f.topics.length > 0) {
      docs = docs.filter((d) => d.topics.some((t) => f.topics.includes(t)));
    }
    if (f.therapeuticAreas.length > 0) {
      docs = docs.filter((d) => d.therapeuticAreas.some((ta) => f.therapeuticAreas.includes(ta)));
    }
    if (f.searchText) {
      const search = f.searchText.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          d.summary.toLowerCase().includes(search) ||
          d.documentNumber.toLowerCase().includes(search)
      );
    }
    
    return docs;
  }, [documents, filters]);
};

// Filtered alerts based on current filters
export const useFilteredAlerts = () => {
  const alerts = useRegIntelStore((s) => s.alerts);
  const filters = useRegIntelStore((s) => s.filters);
  
  return useMemo(() => {
    let result = alerts;
    const f = filters;
    
    if (!f.showResolved) {
      result = result.filter((a) => a.status !== 'resolved');
    }
    if (!f.showDismissed) {
      result = result.filter((a) => a.status !== 'dismissed');
    }
    if (f.alertSeverities.length > 0) {
      result = result.filter((a) => f.alertSeverities.includes(a.severity));
    }
    if (f.agencies.length > 0) {
      result = result.filter((a) => f.agencies.includes(a.sourceAgency));
    }
    if (f.topics.length > 0) {
      result = result.filter((a) => a.affectedTopics.some((t) => f.topics.includes(t)));
    }
    
    return result;
  }, [alerts, filters]);
};

// Filtered deadlines based on current filters
export const useFilteredDeadlines = () => {
  const deadlines = useRegIntelStore((s) => s.deadlines);
  const filters = useRegIntelStore((s) => s.filters);
  
  return useMemo(() => {
    let result = deadlines;
    const f = filters;
    
    if (!f.showResolved) {
      result = result.filter((d) => !['completed', 'waived', 'cancelled'].includes(d.status));
    }
    if (f.deadlinePriorities.length > 0) {
      result = result.filter((d) => f.deadlinePriorities.includes(d.priority));
    }
    if (f.agencies.length > 0) {
      result = result.filter((d) => f.agencies.includes(d.agency));
    }
    if (f.dateRange) {
      result = result.filter(
        (d) => d.dueDate >= f.dateRange!.from && d.dueDate <= f.dateRange!.to
      );
    }
    
    return result;
  }, [deadlines, filters]);
};

// Documents by agency
export const useDocumentsByAgency = (agency: RegulatoryAgencyId) => {
  const documents = useRegIntelStore((s) => s.guidanceDocuments);
  return useMemo(
    () => documents.filter((d) => d.issuingAgency === agency),
    [documents, agency]
  );
};

// Documents by topic
export const useDocumentsByTopic = (topic: RegulatoryTopic) => {
  const documents = useRegIntelStore((s) => s.guidanceDocuments);
  return useMemo(
    () => documents.filter((d) => d.topics.includes(topic)),
    [documents, topic]
  );
};

// Extension requests for a deadline
export const useExtensionRequests = (deadlineId: string) => {
  const requests = useRegIntelStore((s) => s.extensionRequests);
  return useMemo(
    () => requests.filter((r) => r.deadlineId === deadlineId),
    [requests, deadlineId]
  );
};
