

// ============================================================================
// EDC Store - Electronic Data Capture Integration Layer (v52)
// Comprehensive state management for EDC connectors, data feeds,
// query management, data review workflows, and cross-system sync
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import {
  EDCState,
  EDCActions,
  EDCConnector,
  EDCVendor,
  ConnectionStatus,
  SyncStatus,
  EDCFormMapping,
  EDCFieldMapping,
  MappingValidationError,
  CodeListMapping,
  DataFeed,
  FeedExecution,
  EDCQuery,
  QueryStatus,
  QueryMetrics,
  QueryCategory,
  QueryPriority,
  DataReviewWorkflow,
  DataReviewItem,
  DataReview,
  EnrollmentSyncRecord,
  VisitSyncRecord,
  AESyncRecord,
  EDCDashboardData,
  EDCView,
  EDCFilters,
} from './edcTypes';

// ============================================================================
// ID GENERATORS
// ============================================================================

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: EDCState = {
  connectors: {},
  connectorsByStudy: {},
  formMappings: {},
  formMappingsByConnector: {},
  codeListMappings: {},
  dataFeeds: {},
  feedsByConnector: {},
  feedExecutions: {},
  queries: {},
  queriesByStudy: {},
  queriesBySite: {},
  queryMetrics: {},
  reviewWorkflows: {},
  reviewItems: {},
  reviewItemsByWorkflow: {},
  enrollmentSync: {},
  enrollmentSyncByStudy: {},
  visitSync: {},
  visitSyncByStudy: {},
  aeSync: {},
  aeSyncByStudy: {},
  dashboardData: {},
  selectedConnectorId: null,
  selectedFeedId: null,
  selectedQueryId: null,
  activeView: 'connectors',
  filters: {},
  isLoading: false,
  lastError: null,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useEDCStore = create<EDCState & EDCActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // CONNECTOR MANAGEMENT
  // ==========================================================================

  addConnector: (connectorData) => {
    const id = generateId('edc-conn');
    const now = new Date().toISOString();
    
    const connector: EDCConnector = {
      id,
      studyId: connectorData.studyId || '',
      vendor: connectorData.vendor || 'medidata-rave',
      vendorStudyId: connectorData.vendorStudyId || '',
      vendorStudyName: connectorData.vendorStudyName || '',
      environment: connectorData.environment || 'production',
      baseUrl: connectorData.baseUrl || '',
      apiVersion: connectorData.apiVersion || '1.0',
      authMethod: connectorData.authMethod || 'oauth2',
      connectionStatus: 'disconnected',
      lastConnectionTest: now,
      syncEnabled: connectorData.syncEnabled ?? true,
      syncDirection: connectorData.syncDirection || 'inbound',
      syncFrequencyMinutes: connectorData.syncFrequencyMinutes || 15,
      lastSyncAt: now,
      nextSyncAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      syncStatus: 'idle',
      mappingVersion: '1.0',
      mappedForms: 0,
      mappedFields: 0,
      unmappedFields: 0,
      averageSyncDuration: 0,
      recordsProcessedLastSync: 0,
      errorRatePercent: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: connectorData.createdBy || 'system',
      lastModifiedBy: connectorData.lastModifiedBy || 'system',
      ...connectorData,
    };

    set((state) => {
      const studyId = connector.studyId;
      const existingConnectors = state.connectorsByStudy[studyId] || [];
      
      return {
        connectors: { ...state.connectors, [id]: connector },
        connectorsByStudy: {
          ...state.connectorsByStudy,
          [studyId]: [...existingConnectors, id],
        },
        feedsByConnector: { ...state.feedsByConnector, [id]: [] },
        formMappingsByConnector: { ...state.formMappingsByConnector, [id]: [] },
      };
    });

    return connector;
  },

  updateConnector: (connectorId, updates) => {
    set((state) => {
      const existing = state.connectors[connectorId];
      if (!existing) return state;

      return {
        connectors: {
          ...state.connectors,
          [connectorId]: {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  removeConnector: (connectorId) => {
    set((state) => {
      const connector = state.connectors[connectorId];
      if (!connector) return state;

      const { [connectorId]: deleted, ...remainingConnectors } = state.connectors;
      const studyConnectors = (state.connectorsByStudy[connector.studyId] || [])
        .filter(id => id !== connectorId);

      return {
        connectors: remainingConnectors,
        connectorsByStudy: {
          ...state.connectorsByStudy,
          [connector.studyId]: studyConnectors,
        },
      };
    });
  },

  testConnection: async (connectorId) => {
    const connector = get().connectors[connectorId];
    if (!connector) {
      return { success: false, message: 'Connector not found' };
    }

    set((state) => ({
      connectors: {
        ...state.connectors,
        [connectorId]: { ...connector, connectionStatus: 'connecting' },
      },
    }));

    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));

    const success = Math.random() > 0.1; // 90% success rate simulation
    const now = new Date().toISOString();

    set((state) => ({
      connectors: {
        ...state.connectors,
        [connectorId]: {
          ...state.connectors[connectorId],
          connectionStatus: success ? 'connected' : 'error',
          lastConnectionTest: now,
          updatedAt: now,
        },
      },
    }));

    return {
      success,
      message: success ? 'Connection successful' : 'Connection failed: Unable to authenticate',
    };
  },

  syncConnector: async (connectorId) => {
    const connector = get().connectors[connectorId];
    if (!connector) return;

    set((state) => ({
      connectors: {
        ...state.connectors,
        [connectorId]: { ...connector, syncStatus: 'syncing' },
      },
    }));

    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const now = new Date().toISOString();
    const recordsProcessed = Math.floor(Math.random() * 500) + 50;

    set((state) => ({
      connectors: {
        ...state.connectors,
        [connectorId]: {
          ...state.connectors[connectorId],
          syncStatus: 'idle',
          lastSyncAt: now,
          nextSyncAt: new Date(Date.now() + connector.syncFrequencyMinutes * 60 * 1000).toISOString(),
          recordsProcessedLastSync: recordsProcessed,
          averageSyncDuration: Math.random() * 30 + 10,
          updatedAt: now,
        },
      },
    }));
  },

  // ==========================================================================
  // MAPPING MANAGEMENT
  // ==========================================================================

  addFormMapping: (mappingData) => {
    const id = generateId('form-map');
    const now = new Date().toISOString();

    const mapping: EDCFormMapping = {
      id,
      connectorId: mappingData.connectorId || '',
      sourceFormOID: mappingData.sourceFormOID || '',
      sourceFormName: mappingData.sourceFormName || '',
      sourceFormVersion: mappingData.sourceFormVersion || '1.0',
      targetModule: mappingData.targetModule || 'enrollment',
      targetEntity: mappingData.targetEntity || '',
      status: 'unmapped',
      fieldMappings: [],
      totalSourceFields: mappingData.totalSourceFields || 0,
      mappedFieldsCount: 0,
      lastValidated: now,
      validationErrors: [],
      isRepeating: mappingData.isRepeating || false,
      effectiveDate: now,
      ...mappingData,
    };

    set((state) => {
      const connectorId = mapping.connectorId;
      const existingMappings = state.formMappingsByConnector[connectorId] || [];

      return {
        formMappings: { ...state.formMappings, [id]: mapping },
        formMappingsByConnector: {
          ...state.formMappingsByConnector,
          [connectorId]: [...existingMappings, id],
        },
      };
    });

    return mapping;
  },

  updateFormMapping: (mappingId, updates) => {
    set((state) => {
      const existing = state.formMappings[mappingId];
      if (!existing) return state;

      const updated = { ...existing, ...updates };
      updated.mappedFieldsCount = updated.fieldMappings.filter(f => f.status === 'mapped').length;
      updated.status = updated.mappedFieldsCount === updated.totalSourceFields ? 'mapped' :
                       updated.mappedFieldsCount > 0 ? 'partial' : 'unmapped';

      return {
        formMappings: { ...state.formMappings, [mappingId]: updated },
      };
    });
  },

  addFieldMapping: (formMappingId, fieldMappingData) => {
    const id = generateId('field-map');

    const fieldMapping: EDCFieldMapping = {
      id,
      formMappingId,
      sourceFieldOID: fieldMappingData.sourceFieldOID || '',
      sourceFieldName: fieldMappingData.sourceFieldName || '',
      sourceDataType: fieldMappingData.sourceDataType || 'text',
      targetFieldPath: fieldMappingData.targetFieldPath || '',
      targetFieldName: fieldMappingData.targetFieldName || '',
      targetDataType: fieldMappingData.targetDataType || 'text',
      transformationType: fieldMappingData.transformationType || 'direct',
      status: 'mapped',
      validationRules: [],
      isRequired: fieldMappingData.isRequired || false,
      ...fieldMappingData,
    };

    set((state) => {
      const formMapping = state.formMappings[formMappingId];
      if (!formMapping) return state;

      const updatedMapping = {
        ...formMapping,
        fieldMappings: [...formMapping.fieldMappings, fieldMapping],
        mappedFieldsCount: formMapping.mappedFieldsCount + 1,
      };
      updatedMapping.status = updatedMapping.mappedFieldsCount === updatedMapping.totalSourceFields ? 'mapped' : 'partial';

      return {
        formMappings: { ...state.formMappings, [formMappingId]: updatedMapping },
      };
    });

    return fieldMapping;
  },

  updateFieldMapping: (formMappingId, fieldMappingId, updates) => {
    set((state) => {
      const formMapping = state.formMappings[formMappingId];
      if (!formMapping) return state;

      const updatedFieldMappings = formMapping.fieldMappings.map(fm =>
        fm.id === fieldMappingId ? { ...fm, ...updates } : fm
      );

      return {
        formMappings: {
          ...state.formMappings,
          [formMappingId]: { ...formMapping, fieldMappings: updatedFieldMappings },
        },
      };
    });
  },

  validateMapping: (mappingId) => {
    const mapping = get().formMappings[mappingId];
    if (!mapping) return [];

    const errors: MappingValidationError[] = [];

    // Check for unmapped required fields
    mapping.fieldMappings.forEach(fm => {
      if (fm.isRequired && fm.status !== 'mapped') {
        errors.push({
          id: generateId('val-err'),
          fieldMappingId: fm.id,
          errorType: 'missing-mapping',
          message: `Required field ${fm.sourceFieldName} is not mapped`,
          severity: 'error',
        });
      }

      // Check for type mismatches
      if (fm.sourceDataType !== fm.targetDataType && fm.transformationType === 'direct') {
        errors.push({
          id: generateId('val-err'),
          fieldMappingId: fm.id,
          errorType: 'type-mismatch',
          message: `Type mismatch: ${fm.sourceDataType} → ${fm.targetDataType}`,
          severity: 'warning',
          suggestedFix: 'Add transformation rule or change mapping type',
        });
      }
    });

    set((state) => ({
      formMappings: {
        ...state.formMappings,
        [mappingId]: {
          ...mapping,
          validationErrors: errors,
          lastValidated: new Date().toISOString(),
        },
      },
    }));

    return errors;
  },

  // ==========================================================================
  // DATA FEED MANAGEMENT
  // ==========================================================================

  addDataFeed: (feedData) => {
    const id = generateId('feed');
    const now = new Date().toISOString();

    const feed: DataFeed = {
      id,
      connectorId: feedData.connectorId || '',
      studyId: feedData.studyId || '',
      feedType: feedData.feedType || 'enrollment',
      feedName: feedData.feedName || 'New Feed',
      description: feedData.description || '',
      isRealTime: feedData.isRealTime || false,
      scheduleType: feedData.scheduleType || 'interval',
      scheduleValue: feedData.scheduleValue,
      status: 'active',
      lastExecutedAt: now,
      lastSuccessAt: now,
      totalRecordsProcessed: 0,
      recordsInLastSync: 0,
      averageProcessingTime: 0,
      errorCount24h: 0,
      filters: feedData.filters || [],
      createdAt: now,
      updatedAt: now,
      ...feedData,
    };

    set((state) => {
      const connectorId = feed.connectorId;
      const existingFeeds = state.feedsByConnector[connectorId] || [];

      return {
        dataFeeds: { ...state.dataFeeds, [id]: feed },
        feedsByConnector: {
          ...state.feedsByConnector,
          [connectorId]: [...existingFeeds, id],
        },
        feedExecutions: { ...state.feedExecutions, [id]: [] },
      };
    });

    return feed;
  },

  updateDataFeed: (feedId, updates) => {
    set((state) => {
      const existing = state.dataFeeds[feedId];
      if (!existing) return state;

      return {
        dataFeeds: {
          ...state.dataFeeds,
          [feedId]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  removeDataFeed: (feedId) => {
    set((state) => {
      const feed = state.dataFeeds[feedId];
      if (!feed) return state;

      const { [feedId]: deleted, ...remainingFeeds } = state.dataFeeds;
      const connectorFeeds = (state.feedsByConnector[feed.connectorId] || [])
        .filter(id => id !== feedId);

      return {
        dataFeeds: remainingFeeds,
        feedsByConnector: {
          ...state.feedsByConnector,
          [feed.connectorId]: connectorFeeds,
        },
      };
    });
  },

  executeFeed: async (feedId) => {
    const feed = get().dataFeeds[feedId];
    if (!feed) throw new Error('Feed not found');

    const executionId = generateId('exec');
    const startTime = new Date().toISOString();

    const execution: FeedExecution = {
      id: executionId,
      feedId,
      startedAt: startTime,
      status: 'running',
      recordsRetrieved: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      recordsFailed: 0,
      errors: [],
      durationMs: 0,
      apiCallCount: 0,
    };

    set((state) => ({
      feedExecutions: {
        ...state.feedExecutions,
        [feedId]: [...(state.feedExecutions[feedId] || []), execution],
      },
      dataFeeds: {
        ...state.dataFeeds,
        [feedId]: { ...feed, status: 'active', lastExecutedAt: startTime },
      },
    }));

    // Simulate execution
    await new Promise(resolve => setTimeout(resolve, 1500));

    const endTime = new Date().toISOString();
    const recordsRetrieved = Math.floor(Math.random() * 200) + 20;
    const recordsCreated = Math.floor(recordsRetrieved * 0.3);
    const recordsUpdated = Math.floor(recordsRetrieved * 0.6);
    const recordsSkipped = recordsRetrieved - recordsCreated - recordsUpdated;

    const completedExecution: FeedExecution = {
      ...execution,
      completedAt: endTime,
      status: 'completed',
      recordsRetrieved,
      recordsCreated,
      recordsUpdated,
      recordsSkipped,
      durationMs: Date.now() - new Date(startTime).getTime(),
      apiCallCount: Math.ceil(recordsRetrieved / 50),
    };

    set((state) => {
      const executions = state.feedExecutions[feedId] || [];
      const updatedExecutions = executions.map(e => 
        e.id === executionId ? completedExecution : e
      );

      return {
        feedExecutions: { ...state.feedExecutions, [feedId]: updatedExecutions },
        dataFeeds: {
          ...state.dataFeeds,
          [feedId]: {
            ...state.dataFeeds[feedId],
            lastSuccessAt: endTime,
            totalRecordsProcessed: (state.dataFeeds[feedId].totalRecordsProcessed || 0) + recordsRetrieved,
            recordsInLastSync: recordsRetrieved,
            averageProcessingTime: completedExecution.durationMs / 1000,
          },
        },
      };
    });

    return completedExecution;
  },

  pauseFeed: (feedId) => {
    set((state) => {
      const feed = state.dataFeeds[feedId];
      if (!feed) return state;

      return {
        dataFeeds: {
          ...state.dataFeeds,
          [feedId]: { ...feed, status: 'paused', updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  resumeFeed: (feedId) => {
    set((state) => {
      const feed = state.dataFeeds[feedId];
      if (!feed) return state;

      return {
        dataFeeds: {
          ...state.dataFeeds,
          [feedId]: { ...feed, status: 'active', updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  // ==========================================================================
  // QUERY MANAGEMENT
  // ==========================================================================

  createQuery: (queryData) => {
    const id = generateId('query');
    const now = new Date().toISOString();

    const query: EDCQuery = {
      id,
      connectorId: queryData.connectorId || '',
      studyId: queryData.studyId || '',
      siteId: queryData.siteId || '',
      subjectId: queryData.subjectId || '',
      queryNumber: queryData.queryNumber || `Q-${Date.now()}`,
      externalQueryId: queryData.externalQueryId || '',
      formOID: queryData.formOID || '',
      formName: queryData.formName || '',
      fieldOID: queryData.fieldOID || '',
      fieldName: queryData.fieldName || '',
      type: queryData.type || 'manual',
      category: queryData.category || 'clarification',
      priority: queryData.priority || 'medium',
      status: 'open',
      queryText: queryData.queryText || '',
      currentValue: queryData.currentValue,
      expectedValue: queryData.expectedValue,
      isOverdue: false,
      requiresFollowUp: false,
      followUpCount: 0,
      history: [{
        id: generateId('hist'),
        timestamp: now,
        action: 'created',
        performedBy: queryData.createdBy || 'system',
        newStatus: 'open',
      }],
      createdAt: now,
      createdBy: queryData.createdBy || 'system',
      updatedAt: now,
      ...queryData,
    };

    set((state) => {
      const studyQueries = state.queriesByStudy[query.studyId] || [];
      const siteQueries = state.queriesBySite[query.siteId] || [];

      return {
        queries: { ...state.queries, [id]: query },
        queriesByStudy: {
          ...state.queriesByStudy,
          [query.studyId]: [...studyQueries, id],
        },
        queriesBySite: {
          ...state.queriesBySite,
          [query.siteId]: [...siteQueries, id],
        },
      };
    });

    return query;
  },

  updateQuery: (queryId, updates) => {
    set((state) => {
      const existing = state.queries[queryId];
      if (!existing) return state;

      return {
        queries: {
          ...state.queries,
          [queryId]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  answerQuery: (queryId, response, respondedBy) => {
    const now = new Date().toISOString();
    
    set((state) => {
      const query = state.queries[queryId];
      if (!query) return state;

      const historyEntry = {
        id: generateId('hist'),
        timestamp: now,
        action: 'answered' as const,
        performedBy: respondedBy,
        previousStatus: query.status,
        newStatus: 'answered' as QueryStatus,
        comment: response,
      };

      return {
        queries: {
          ...state.queries,
          [queryId]: {
            ...query,
            status: 'answered',
            responseText: response,
            respondedBy,
            respondedAt: now,
            history: [...query.history, historyEntry],
            updatedAt: now,
          },
        },
      };
    });
  },

  closeQuery: (queryId, resolvedBy, notes) => {
    const now = new Date().toISOString();
    
    set((state) => {
      const query = state.queries[queryId];
      if (!query) return state;

      const historyEntry = {
        id: generateId('hist'),
        timestamp: now,
        action: 'closed' as const,
        performedBy: resolvedBy,
        previousStatus: query.status,
        newStatus: 'closed' as QueryStatus,
        comment: notes,
      };

      return {
        queries: {
          ...state.queries,
          [queryId]: {
            ...query,
            status: 'closed',
            resolvedBy,
            resolvedAt: now,
            resolutionNotes: notes,
            history: [...query.history, historyEntry],
            updatedAt: now,
          },
        },
      };
    });
  },

  reopenQuery: (queryId, reason) => {
    const now = new Date().toISOString();
    
    set((state) => {
      const query = state.queries[queryId];
      if (!query) return state;

      const historyEntry = {
        id: generateId('hist'),
        timestamp: now,
        action: 'reopened' as const,
        performedBy: 'system',
        previousStatus: query.status,
        newStatus: 'requeried' as QueryStatus,
        comment: reason,
      };

      return {
        queries: {
          ...state.queries,
          [queryId]: {
            ...query,
            status: 'requeried',
            followUpCount: query.followUpCount + 1,
            requiresFollowUp: true,
            history: [...query.history, historyEntry],
            updatedAt: now,
          },
        },
      };
    });
  },

  assignQuery: (queryId, assignee) => {
    const now = new Date().toISOString();
    
    set((state) => {
      const query = state.queries[queryId];
      if (!query) return state;

      const historyEntry = {
        id: generateId('hist'),
        timestamp: now,
        action: 'reassigned' as const,
        performedBy: 'system',
        comment: `Assigned to ${assignee}`,
      };

      return {
        queries: {
          ...state.queries,
          [queryId]: {
            ...query,
            assignedTo: assignee,
            history: [...query.history, historyEntry],
            updatedAt: now,
          },
        },
      };
    });
  },

  bulkCloseQueries: (queryIds, resolvedBy) => {
    const now = new Date().toISOString();
    
    set((state) => {
      const updatedQueries = { ...state.queries };
      
      queryIds.forEach(queryId => {
        const query = updatedQueries[queryId];
        if (query && query.status !== 'closed') {
          updatedQueries[queryId] = {
            ...query,
            status: 'closed',
            resolvedBy,
            resolvedAt: now,
            history: [...query.history, {
              id: generateId('hist'),
              timestamp: now,
              action: 'closed' as const,
              performedBy: resolvedBy,
              previousStatus: query.status,
              newStatus: 'closed' as QueryStatus,
              comment: 'Bulk closed',
            }],
            updatedAt: now,
          };
        }
      });

      return { queries: updatedQueries };
    });
  },

  calculateQueryMetrics: (studyId) => {
    const state = get();
    const queryIds = state.queriesByStudy[studyId] || [];
    const queries = queryIds.map(id => state.queries[id]).filter(Boolean);

    const now = new Date();
    const metrics: QueryMetrics = {
      studyId,
      asOfDate: now.toISOString(),
      totalQueries: queries.length,
      openQueries: queries.filter(q => q.status === 'open' || q.status === 'requeried').length,
      answeredQueries: queries.filter(q => q.status === 'answered').length,
      closedQueries: queries.filter(q => q.status === 'closed').length,
      queryRate: 0,
      averageResolutionDays: 0,
      overdueCount: queries.filter(q => q.isOverdue).length,
      overduePercent: 0,
      byCategory: [],
      bySite: [],
      byPriority: [],
      weeklyTrend: [],
      aging: {
        lessThan7Days: 0,
        between7And14Days: 0,
        between14And30Days: 0,
        moreThan30Days: 0,
      },
    };

    // Calculate by category
    const categories: QueryCategory[] = ['missing-data', 'data-inconsistency', 'protocol-deviation', 'range-check', 'edit-check', 'clarification', 'ae-follow-up', 'consent', 'other'];
    metrics.byCategory = categories.map(category => ({
      category,
      count: queries.filter(q => q.category === category).length,
      openCount: queries.filter(q => q.category === category && (q.status === 'open' || q.status === 'requeried')).length,
    }));

    // Calculate by priority
    const priorities: QueryPriority[] = ['low', 'medium', 'high', 'critical'];
    metrics.byPriority = priorities.map(priority => ({
      priority,
      count: queries.filter(q => q.priority === priority).length,
      openCount: queries.filter(q => q.priority === priority && (q.status === 'open' || q.status === 'requeried')).length,
      avgResolutionDays: 0,
    }));

    // Calculate aging for open queries
    const openQueries = queries.filter(q => q.status === 'open' || q.status === 'requeried');
    openQueries.forEach(q => {
      const daysOpen = Math.floor((now.getTime() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOpen < 7) metrics.aging.lessThan7Days++;
      else if (daysOpen < 14) metrics.aging.between7And14Days++;
      else if (daysOpen < 30) metrics.aging.between14And30Days++;
      else metrics.aging.moreThan30Days++;
    });

    if (metrics.openQueries > 0) {
      metrics.overduePercent = (metrics.overdueCount / metrics.openQueries) * 100;
    }

    set((state) => ({
      queryMetrics: { ...state.queryMetrics, [studyId]: metrics },
    }));

    return metrics;
  },

  // ==========================================================================
  // DATA REVIEW MANAGEMENT
  // ==========================================================================

  createReviewWorkflow: (workflowData) => {
    const id = generateId('review-wf');
    const now = new Date().toISOString();

    const workflow: DataReviewWorkflow = {
      id,
      studyId: workflowData.studyId || '',
      connectorId: workflowData.connectorId || '',
      name: workflowData.name || 'New Workflow',
      reviewType: workflowData.reviewType || 'data-management',
      description: workflowData.description || '',
      scope: workflowData.scope || { forms: [], visits: [], sites: [] },
      steps: workflowData.steps || [],
      isActive: true,
      pendingReviews: 0,
      completedToday: 0,
      averageReviewTime: 0,
      createdAt: now,
      updatedAt: now,
      ...workflowData,
    };

    set((state) => ({
      reviewWorkflows: { ...state.reviewWorkflows, [id]: workflow },
      reviewItemsByWorkflow: { ...state.reviewItemsByWorkflow, [id]: [] },
    }));

    return workflow;
  },

  updateReviewWorkflow: (workflowId, updates) => {
    set((state) => {
      const existing = state.reviewWorkflows[workflowId];
      if (!existing) return state;

      return {
        reviewWorkflows: {
          ...state.reviewWorkflows,
          [workflowId]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
        },
      };
    });
  },

  createReviewItem: (itemData) => {
    const id = generateId('review-item');
    const now = new Date().toISOString();

    const item: DataReviewItem = {
      id,
      workflowId: itemData.workflowId || '',
      studyId: itemData.studyId || '',
      siteId: itemData.siteId || '',
      subjectId: itemData.subjectId || '',
      formOID: itemData.formOID || '',
      formName: itemData.formName || '',
      visitName: itemData.visitName || '',
      status: 'pending',
      currentStep: 0,
      dataSnapshot: itemData.dataSnapshot || {},
      changedFields: itemData.changedFields || [],
      isSDV: itemData.isSDV || false,
      reviews: [],
      createdAt: now,
      updatedAt: now,
      isOverdue: false,
      ...itemData,
    };

    set((state) => {
      const workflowItems = state.reviewItemsByWorkflow[item.workflowId] || [];

      return {
        reviewItems: { ...state.reviewItems, [id]: item },
        reviewItemsByWorkflow: {
          ...state.reviewItemsByWorkflow,
          [item.workflowId]: [...workflowItems, id],
        },
      };
    });

    return item;
  },

  submitReview: (reviewItemId, reviewData) => {
    const now = new Date().toISOString();

    set((state) => {
      const item = state.reviewItems[reviewItemId];
      if (!item) return state;

      const review: DataReview = {
        id: generateId('review'),
        reviewItemId,
        step: item.currentStep,
        reviewerId: reviewData.reviewerId || '',
        reviewerName: reviewData.reviewerName || '',
        reviewerRole: reviewData.reviewerRole || '',
        decision: reviewData.decision || 'approved',
        comments: reviewData.comments,
        findings: reviewData.findings || [],
        assignedAt: item.updatedAt,
        completedAt: now,
        durationMinutes: Math.floor(Math.random() * 30) + 5,
      };

      const workflow = state.reviewWorkflows[item.workflowId];
      const isLastStep = workflow && item.currentStep >= workflow.steps.length - 1;
      const newStatus = reviewData.decision === 'approved' && isLastStep ? 'approved' :
                       reviewData.decision === 'rejected' ? 'rejected' :
                       reviewData.decision === 'escalated' ? 'escalated' : 'in-review';

      return {
        reviewItems: {
          ...state.reviewItems,
          [reviewItemId]: {
            ...item,
            status: newStatus,
            currentStep: reviewData.decision === 'approved' ? item.currentStep + 1 : item.currentStep,
            reviews: [...item.reviews, review],
            updatedAt: now,
          },
        },
      };
    });
  },

  assignReviewItem: (reviewItemId, assignee) => {
    set((state) => {
      const item = state.reviewItems[reviewItemId];
      if (!item) return state;

      return {
        reviewItems: {
          ...state.reviewItems,
          [reviewItemId]: {
            ...item,
            assignedTo: assignee,
            status: 'in-review',
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // ==========================================================================
  // ENROLLMENT SYNC
  // ==========================================================================

  syncEnrollment: async (connectorId) => {
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    const now = new Date().toISOString();
    const records: EnrollmentSyncRecord[] = [];

    // Generate sample sync records
    for (let i = 0; i < 5; i++) {
      const record: EnrollmentSyncRecord = {
        id: generateId('enroll-sync'),
        connectorId,
        studyId: get().connectors[connectorId]?.studyId || '',
        siteId: `site-${i}`,
        edcSubjectId: `EDC-SUBJ-${1000 + i}`,
        edcSubjectNumber: `${1000 + i}`,
        edcSiteNumber: `001-US-00${i + 1}`,
        syncStatus: 'synced',
        lastSyncAt: now,
        subjectStatus: 'enrolled',
        statusDate: now,
        enrollmentDate: now,
        createdAt: now,
        updatedAt: now,
      };

      records.push(record);
    }

    set((state) => {
      const newRecords: Record<string, EnrollmentSyncRecord> = {};
      const studyRecordIds: string[] = [];

      records.forEach(r => {
        newRecords[r.id] = r;
        studyRecordIds.push(r.id);
      });

      const studyId = records[0]?.studyId || '';
      const existingStudyRecords = state.enrollmentSyncByStudy[studyId] || [];

      return {
        enrollmentSync: { ...state.enrollmentSync, ...newRecords },
        enrollmentSyncByStudy: {
          ...state.enrollmentSyncByStudy,
          [studyId]: [...existingStudyRecords, ...studyRecordIds],
        },
      };
    });

    return records;
  },

  resolveEnrollmentConflict: (syncRecordId, conflictId, resolution, resolvedBy) => {
    set((state) => {
      const record = state.enrollmentSync[syncRecordId];
      if (!record || !record.conflicts) return state;

      const updatedConflicts = record.conflicts.map(c =>
        c.id === conflictId
          ? { ...c, resolution, resolvedBy, resolvedAt: new Date().toISOString() }
          : c
      );

      const hasUnresolvedConflicts = updatedConflicts.some(c => !c.resolvedAt);

      return {
        enrollmentSync: {
          ...state.enrollmentSync,
          [syncRecordId]: {
            ...record,
            conflicts: updatedConflicts,
            syncStatus: hasUnresolvedConflicts ? 'conflict' : 'synced',
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  // ==========================================================================
  // VISIT SYNC
  // ==========================================================================

  syncVisits: async (connectorId) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const now = new Date().toISOString();
    const records: VisitSyncRecord[] = [];

    for (let i = 0; i < 10; i++) {
      const record: VisitSyncRecord = {
        id: generateId('visit-sync'),
        connectorId,
        studyId: get().connectors[connectorId]?.studyId || '',
        siteId: `site-${i % 3}`,
        subjectId: `subj-${Math.floor(i / 3)}`,
        edcVisitOID: `VISIT_${i + 1}`,
        edcVisitName: `Visit ${i + 1}`,
        syncStatus: 'synced',
        lastSyncAt: now,
        visitStatus: 'completed',
        visitDate: now,
        isWithinWindow: true,
        dataEntryStatus: 'complete',
        formsCompleted: 5,
        totalForms: 5,
        queriesOpen: Math.floor(Math.random() * 3),
        createdAt: now,
        updatedAt: now,
      };

      records.push(record);
    }

    set((state) => {
      const newRecords: Record<string, VisitSyncRecord> = {};
      records.forEach(r => { newRecords[r.id] = r; });

      const studyId = records[0]?.studyId || '';
      const existingRecords = state.visitSyncByStudy[studyId] || [];

      return {
        visitSync: { ...state.visitSync, ...newRecords },
        visitSyncByStudy: {
          ...state.visitSyncByStudy,
          [studyId]: [...existingRecords, ...records.map(r => r.id)],
        },
      };
    });

    return records;
  },

  // ==========================================================================
  // AE SYNC
  // ==========================================================================

  syncAEs: async (connectorId) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const now = new Date().toISOString();
    const records: AESyncRecord[] = [];

    for (let i = 0; i < 5; i++) {
      const record: AESyncRecord = {
        id: generateId('ae-sync'),
        connectorId,
        studyId: get().connectors[connectorId]?.studyId || '',
        siteId: `site-${i}`,
        subjectId: `subj-${i}`,
        edcAEId: `AE-${1000 + i}`,
        edcAENumber: `${1000 + i}`,
        syncStatus: 'synced',
        lastSyncAt: now,
        aeterm: ['Headache', 'Nausea', 'Fatigue', 'Dizziness', 'Rash'][i],
        onsetDate: now,
        outcome: 'resolved',
        severity: ['mild', 'moderate', 'mild', 'mild', 'moderate'][i],
        seriousness: 'non-serious',
        causality: 'possibly related',
        requiresExpedited: false,
        createdAt: now,
        updatedAt: now,
      };

      records.push(record);
    }

    set((state) => {
      const newRecords: Record<string, AESyncRecord> = {};
      records.forEach(r => { newRecords[r.id] = r; });

      const studyId = records[0]?.studyId || '';
      const existingRecords = state.aeSyncByStudy[studyId] || [];

      return {
        aeSync: { ...state.aeSync, ...newRecords },
        aeSyncByStudy: {
          ...state.aeSyncByStudy,
          [studyId]: [...existingRecords, ...records.map(r => r.id)],
        },
      };
    });

    return records;
  },

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  refreshDashboard: (studyId) => {
    const state = get();
    const now = new Date().toISOString();

    const connectorIds = state.connectorsByStudy[studyId] || [];
    const connectors = connectorIds.map(id => state.connectors[id]).filter(Boolean);

    const queryIds = state.queriesByStudy[studyId] || [];
    const queries = queryIds.map(id => state.queries[id]).filter(Boolean);

    const dashboard: EDCDashboardData = {
      studyId,
      asOfDate: now,
      connectors: connectors.map(c => ({
        connectorId: c.id,
        vendor: c.vendor,
        status: c.connectionStatus,
        syncStatus: c.syncStatus,
        lastSync: c.lastSyncAt,
        errorCount24h: c.errorRatePercent > 5 ? Math.floor(Math.random() * 10) : 0,
        healthScore: c.connectionStatus === 'connected' ? 95 : c.connectionStatus === 'error' ? 30 : 70,
      })),
      lastDataSync: connectors.length > 0 ? connectors[0].lastSyncAt : now,
      dataLagMinutes: Math.floor(Math.random() * 30),
      totalSubjects: Math.floor(Math.random() * 500) + 100,
      totalForms: Math.floor(Math.random() * 5000) + 1000,
      totalDataPoints: Math.floor(Math.random() * 50000) + 10000,
      queryRate: queries.length / 10,
      openQueries: queries.filter(q => q.status === 'open' || q.status === 'requeried').length,
      overdueQueries: queries.filter(q => q.isOverdue).length,
      dataCompleteness: Math.floor(Math.random() * 15) + 85,
      syncErrorsLast24h: Math.floor(Math.random() * 5),
      recordsProcessedLast24h: Math.floor(Math.random() * 1000) + 500,
      pendingReviews: Math.floor(Math.random() * 50),
      reviewBacklog: Math.floor(Math.random() * 20),
      siteDataStatus: [],
    };

    set((state) => ({
      dashboardData: { ...state.dashboardData, [studyId]: dashboard },
    }));

    return dashboard;
  },

  // ==========================================================================
  // UI ACTIONS
  // ==========================================================================

  setSelectedConnector: (connectorId) => {
    set({ selectedConnectorId: connectorId });
  },

  setSelectedFeed: (feedId) => {
    set({ selectedFeedId: feedId });
  },

  setSelectedQuery: (queryId) => {
    set({ selectedQueryId: queryId });
  },

  setActiveView: (view) => {
    set({ activeView: view });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set({ filters: {} });
  },
}));

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useSelectedConnector = () => {
  const selectedId = useEDCStore(state => state.selectedConnectorId);
  const connectors = useEDCStore(state => state.connectors);
  return selectedId ? connectors[selectedId] : null;
};

export const useSelectedFeed = () => {
  const selectedId = useEDCStore(state => state.selectedFeedId);
  const feeds = useEDCStore(state => state.dataFeeds);
  return selectedId ? feeds[selectedId] : null;
};

export const useSelectedQuery = () => {
  const selectedId = useEDCStore(state => state.selectedQueryId);
  const queries = useEDCStore(state => state.queries);
  return selectedId ? queries[selectedId] : null;
};

export const useStudyConnectors = (studyId: string) => {
  const connectorsByStudy = useEDCStore(state => state.connectorsByStudy);
  const connectors = useEDCStore(state => state.connectors);
  return useMemo(() => {
    const connectorIds = connectorsByStudy[studyId] || [];
    return connectorIds.map(id => connectors[id]).filter(Boolean);
  }, [connectorsByStudy, studyId, connectors]);
};

export const useConnectorFeeds = (connectorId: string) => {
  const feedsByConnector = useEDCStore(state => state.feedsByConnector);
  const feeds = useEDCStore(state => state.dataFeeds);
  return useMemo(() => {
    const feedIds = feedsByConnector[connectorId] || [];
    return feedIds.map(id => feeds[id]).filter(Boolean);
  }, [feedsByConnector, connectorId, feeds]);
};

export const useStudyQueries = (studyId: string) => {
  const queriesByStudy = useEDCStore(state => state.queriesByStudy);
  const queries = useEDCStore(state => state.queries);
  return useMemo(() => {
    const queryIds = queriesByStudy[studyId] || [];
    return queryIds.map(id => queries[id]).filter(Boolean);
  }, [queriesByStudy, studyId, queries]);
};

export const useSiteQueries = (siteId: string) => {
  const queriesBySite = useEDCStore(state => state.queriesBySite);
  const queries = useEDCStore(state => state.queries);
  return useMemo(() => {
    const queryIds = queriesBySite[siteId] || [];
    return queryIds.map(id => queries[id]).filter(Boolean);
  }, [queriesBySite, siteId, queries]);
};

export const useOpenQueries = (studyId: string) => {
  const queries = useStudyQueries(studyId);
  return useMemo(() => queries.filter(q => q.status === 'open' || q.status === 'requeried'), [queries]);
};

export const useQueryMetrics = (studyId: string) => {
  return useEDCStore(state => state.queryMetrics[studyId]);
};

export const useStudyDashboard = (studyId: string) => {
  return useEDCStore(state => state.dashboardData[studyId]);
};

export const useConnectorMappings = (connectorId: string) => {
  const formMappingsByConnector = useEDCStore(state => state.formMappingsByConnector);
  const mappings = useEDCStore(state => state.formMappings);
  return useMemo(() => {
    const mappingIds = formMappingsByConnector[connectorId] || [];
    return mappingIds.map(id => mappings[id]).filter(Boolean);
  }, [formMappingsByConnector, connectorId, mappings]);
};

export const useFeedExecutions = (feedId: string) => {
  return useEDCStore(state => state.feedExecutions[feedId] || []);
};

export const useReviewWorkflow = (workflowId: string) => {
  return useEDCStore(state => state.reviewWorkflows[workflowId]);
};

export const useWorkflowReviewItems = (workflowId: string) => {
  const reviewItemsByWorkflow = useEDCStore(state => state.reviewItemsByWorkflow);
  const items = useEDCStore(state => state.reviewItems);
  return useMemo(() => {
    const itemIds = reviewItemsByWorkflow[workflowId] || [];
    return itemIds.map(id => items[id]).filter(Boolean);
  }, [reviewItemsByWorkflow, workflowId, items]);
};

export const useStudyEnrollmentSync = (studyId: string) => {
  const enrollmentSyncByStudy = useEDCStore(state => state.enrollmentSyncByStudy);
  const records = useEDCStore(state => state.enrollmentSync);
  return useMemo(() => {
    const recordIds = enrollmentSyncByStudy[studyId] || [];
    return recordIds.map(id => records[id]).filter(Boolean);
  }, [enrollmentSyncByStudy, studyId, records]);
};

export const useStudyVisitSync = (studyId: string) => {
  const visitSyncByStudy = useEDCStore(state => state.visitSyncByStudy);
  const records = useEDCStore(state => state.visitSync);
  return useMemo(() => {
    const recordIds = visitSyncByStudy[studyId] || [];
    return recordIds.map(id => records[id]).filter(Boolean);
  }, [visitSyncByStudy, studyId, records]);
};

export const useStudyAESync = (studyId: string) => {
  const aeSyncByStudy = useEDCStore(state => state.aeSyncByStudy);
  const records = useEDCStore(state => state.aeSync);
  return useMemo(() => {
    const recordIds = aeSyncByStudy[studyId] || [];
    return recordIds.map(id => records[id]).filter(Boolean);
  }, [aeSyncByStudy, studyId, records]);
};
