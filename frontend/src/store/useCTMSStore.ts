

// ============================================================================
// CTMS Store - Clinical Trial Management System (v52)
// Comprehensive state management for study design, sites, enrollment,
// protocol deviations, visit scheduling, and operational metrics
// With cross-module event emissions (v0.27.46)
// ============================================================================

import { create } from 'zustand';
import { useMemo } from 'react';
import { useCrossModuleStore } from './useCrossModuleStore';
import {
  CTMSState,
  CTMSActions,
  CTMSStudy,
  CTMSStudyStatus,
  CTMSView,
  CTMSFilters,
  StudyDesign,
  StudyArm,
  DoseEscalationCohort,
  StudyEndpoint,
  ClinicalSite,
  SiteStatus,
  EnrollmentTracking,
  EnrollmentForecast,
  VisitSchedule,
  VisitDefinition,
  SubjectVisit,
  ProtocolDeviation,
  DeviationSummary,
  MonitoringVisit,
  MonitoringFinding,
  FollowUpItem,
  CTMSStudyMetrics,
  // v204b: Bidirectional Sync Types
  BidirectionalSyncConfig,
  BidirectionalSyncResult,
  SyncConflict,
  CTMSLocalEdit,
  ConflictField,
  ConflictResolutionStrategy,
} from './ctmsTypes';

// ============================================================================
// ID GENERATORS
// ============================================================================

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: CTMSState = {
  studies: {},
  studyDesigns: {},
  studyArms: {},
  doseEscalationCohorts: {},
  studyEndpoints: {},
  sites: {},
  sitesByStudy: {},
  enrollmentTracking: {},
  enrollmentForecasts: {},
  visitSchedules: {},
  subjectVisits: {},
  protocolDeviations: {},
  deviationsByStudy: {},
  deviationSummaries: {},
  monitoringVisits: {},
  monitoringBySite: {},
  studyMetrics: {},
  // v204b: Bidirectional Sync State
  syncConfigs: {},
  pendingConflicts: {},
  localEdits: {},
  lastSyncResults: {},
  // UI State
  selectedStudyId: null,
  selectedSiteId: null,
  activeView: 'study-overview',
  filters: {},
  isLoading: false,
  lastError: null,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCTMSStore = create<CTMSState & CTMSActions>((set, get) => ({
  ...initialState,

  // ==========================================================================
  // STUDY MANAGEMENT
  // ==========================================================================

  createStudy: (studyData) => {
    const id = generateId('study');
    const now = new Date().toISOString();
    
    const study: CTMSStudy = {
      id,
      protocolNumber: studyData.protocolNumber || `PROT-${Date.now()}`,
      title: studyData.title || 'New Study',
      shortTitle: studyData.shortTitle || 'New Study',
      productId: studyData.productId || '',
      productName: studyData.productName || '',
      indication: studyData.indication || '',
      phase: studyData.phase || 'Phase 1',
      type: studyData.type || 'interventional',
      status: studyData.status || 'planning',
      sponsor: studyData.sponsor || '',
      medicalMonitor: studyData.medicalMonitor || '',
      projectManager: studyData.projectManager || '',
      plannedStartDate: studyData.plannedStartDate || now,
      targetEnrollment: studyData.targetEnrollment || 0,
      enrolledSubjects: 0,
      targetSites: studyData.targetSites || 0,
      totalSites: 0,
      activeSites: 0,
      countries: studyData.countries || [],
      regions: studyData.regions || [],
      riskScore: 'low',
      createdAt: now,
      updatedAt: now,
      ...studyData,
    };

    set((state) => ({
      studies: { ...state.studies, [id]: study },
      sitesByStudy: { ...state.sitesByStudy, [id]: [] },
      deviationsByStudy: { ...state.deviationsByStudy, [id]: [] },
    }));

    // Emit cross-module event
    useCrossModuleStore.getState().emitEvent({
      eventType: 'entity-created',
      sourceModule: 'ctms',
      targetModules: ['tmf', 'regulatory', 'authoring'],
      entityType: 'study',
      entityId: id,
      description: `Study created: ${study.protocolNumber} - ${study.title}`,
      payload: { protocolNumber: study.protocolNumber, title: study.title, phase: study.phase },
    });

    return study;
  },

  updateStudy: (studyId, updates) => {
    const existing = get().studies[studyId];
    const oldStatus = existing?.status;
    
    set((state) => {
      const study = state.studies[studyId];
      if (!study) return state;

      return {
        studies: {
          ...state.studies,
          [studyId]: {
            ...study,
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    
    // Emit event if status changed
    if (existing && updates.status && updates.status !== oldStatus) {
      useCrossModuleStore.getState().emitEvent({
        eventType: 'entity-status-changed',
        sourceModule: 'ctms',
        targetModules: ['tmf', 'regulatory', 'authoring'],
        entityType: 'study',
        entityId: studyId,
        description: `Study ${existing.protocolNumber}: ${oldStatus} → ${updates.status}`,
        payload: { protocolNumber: existing.protocolNumber, fromStatus: oldStatus, toStatus: updates.status },
      });
    }
  },

  deleteStudy: (studyId) => {
    set((state) => {
      const { [studyId]: deleted, ...remainingStudies } = state.studies;
      const { [studyId]: deletedDesign, ...remainingDesigns } = state.studyDesigns;
      const { [studyId]: deletedArms, ...remainingArms } = state.studyArms;
      const { [studyId]: deletedEndpoints, ...remainingEndpoints } = state.studyEndpoints;
      const { [studyId]: deletedSites, ...remainingSitesByStudy } = state.sitesByStudy;
      const { [studyId]: deletedDeviations, ...remainingDeviationsByStudy } = state.deviationsByStudy;

      return {
        studies: remainingStudies,
        studyDesigns: remainingDesigns,
        studyArms: remainingArms,
        studyEndpoints: remainingEndpoints,
        sitesByStudy: remainingSitesByStudy,
        deviationsByStudy: remainingDeviationsByStudy,
        selectedStudyId: state.selectedStudyId === studyId ? null : state.selectedStudyId,
      };
    });
  },

  // ==========================================================================
  // STUDY DESIGN
  // ==========================================================================

  setStudyDesign: (studyId, designData) => {
    const id = generateId('design');
    const now = new Date().toISOString();

    const design: StudyDesign = {
      id,
      studyId,
      type: designData.type || 'interventional',
      phase: designData.phase || 'Phase 1',
      blinding: designData.blinding || 'open-label',
      randomization: designData.randomization || 'none',
      allocationRatio: designData.allocationRatio || '1:1',
      hasPlacebo: designData.hasPlacebo || false,
      hasActiveComparator: designData.hasActiveComparator || false,
      isAdaptive: designData.isAdaptive || false,
      interimAnalyses: designData.interimAnalyses || [],
      stratificationFactors: designData.stratificationFactors || [],
      treatmentDurationWeeks: designData.treatmentDurationWeeks || 0,
      followUpDurationWeeks: designData.followUpDurationWeeks || 0,
      totalDurationWeeks: (designData.treatmentDurationWeeks || 0) + (designData.followUpDurationWeeks || 0),
      createdAt: now,
      updatedAt: now,
      ...designData,
    };

    set((state) => ({
      studyDesigns: { ...state.studyDesigns, [studyId]: design },
    }));

    return design;
  },

  addStudyArm: (studyId, armData) => {
    const id = generateId('arm');

    const arm: StudyArm = {
      id,
      studyId,
      name: armData.name || 'New Arm',
      shortName: armData.shortName || 'Arm',
      type: armData.type || 'experimental',
      description: armData.description || '',
      intervention: armData.intervention || '',
      targetEnrollment: armData.targetEnrollment || 0,
      enrolledSubjects: 0,
      activeSubjects: 0,
      completedSubjects: 0,
      discontinuedSubjects: 0,
      status: 'open',
      allocationWeight: armData.allocationWeight || 1,
      ...armData,
    };

    set((state) => ({
      studyArms: {
        ...state.studyArms,
        [studyId]: [...(state.studyArms[studyId] || []), arm],
      },
    }));

    return arm;
  },

  updateStudyArm: (studyId, armId, updates) => {
    set((state) => {
      const arms = state.studyArms[studyId] || [];
      return {
        studyArms: {
          ...state.studyArms,
          [studyId]: arms.map((arm) =>
            arm.id === armId ? { ...arm, ...updates } : arm
          ),
        },
      };
    });
  },

  removeStudyArm: (studyId, armId) => {
    set((state) => ({
      studyArms: {
        ...state.studyArms,
        [studyId]: (state.studyArms[studyId] || []).filter((a) => a.id !== armId),
      },
    }));
  },

  addEndpoint: (studyId, endpointData) => {
    const id = generateId('endpoint');

    const endpoint: StudyEndpoint = {
      id,
      studyId,
      type: endpointData.type || 'secondary',
      category: endpointData.category || 'efficacy',
      name: endpointData.name || 'New Endpoint',
      fullDefinition: endpointData.fullDefinition || '',
      assessmentMethod: endpointData.assessmentMethod || '',
      assessmentTimepoint: endpointData.assessmentTimepoint || '',
      status: 'pending',
      ...endpointData,
    };

    set((state) => ({
      studyEndpoints: {
        ...state.studyEndpoints,
        [studyId]: [...(state.studyEndpoints[studyId] || []), endpoint],
      },
    }));

    return endpoint;
  },

  updateEndpoint: (studyId, endpointId, updates) => {
    set((state) => {
      const endpoints = state.studyEndpoints[studyId] || [];
      return {
        studyEndpoints: {
          ...state.studyEndpoints,
          [studyId]: endpoints.map((ep) =>
            ep.id === endpointId ? { ...ep, ...updates } : ep
          ),
        },
      };
    });
  },

  removeEndpoint: (studyId, endpointId) => {
    set((state) => ({
      studyEndpoints: {
        ...state.studyEndpoints,
        [studyId]: (state.studyEndpoints[studyId] || []).filter((ep) => ep.id !== endpointId),
      },
    }));
  },

  // ==========================================================================
  // v204a: USDM SYNC
  // ==========================================================================

  syncEndpointsFromUSDM: (studyId, usdmEndpoints) => {
    const state = get();
    const existingEndpoints = state.studyEndpoints[studyId] || [];
    const now = new Date().toISOString();
    
    // Build lookup of existing CTMS endpoints by USDM source ID
    const ctmsByUsdmId = new Map<string, StudyEndpoint>();
    existingEndpoints.forEach(ep => {
      if (ep.usdmSourceId) {
        ctmsByUsdmId.set(ep.usdmSourceId, ep);
      }
    });
    
    const result = {
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: [] as string[],
      syncedAt: now,
    };
    
    const newEndpoints: StudyEndpoint[] = [...existingEndpoints];
    
    usdmEndpoints.forEach(usdmEp => {
      try {
        // Generate version hash for change detection
        const content = `${usdmEp.endpointDescription}|${usdmEp.endpointLevel?.decode || ''}`;
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          const char = content.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        const versionHash = Math.abs(hash).toString(16).padStart(8, '0');
        
        const existingCTMS = ctmsByUsdmId.get(usdmEp.id);
        
        // Map USDM level to CTMS type
        const levelMap: Record<string, 'primary' | 'secondary' | 'exploratory'> = {
          'PRIMARY': 'primary',
          'SECONDARY': 'secondary',
          'EXPLORATORY': 'exploratory',
        };
        const endpointType = levelMap[(usdmEp.endpointLevel?.decode || 'PRIMARY').toUpperCase()] || 'exploratory';
        
        // Infer category from description
        const lowerDesc = usdmEp.endpointDescription.toLowerCase();
        let category: 'efficacy' | 'safety' | 'pharmacokinetic' | 'biomarker' | 'patient-reported' | 'quality-of-life' = 'efficacy';
        if (lowerDesc.includes('safety') || lowerDesc.includes('adverse')) {
          category = 'safety';
        } else if (lowerDesc.includes('pharmacokinetic') || lowerDesc.includes('pk')) {
          category = 'pharmacokinetic';
        } else if (lowerDesc.includes('biomarker')) {
          category = 'biomarker';
        } else if (lowerDesc.includes('quality of life') || lowerDesc.includes('qol')) {
          category = 'patient-reported';
        }
        
        // Extract short name
        const acronymMatch = usdmEp.endpointDescription.match(/\(([A-Z]{2,6})\)/);
        let name = acronymMatch ? acronymMatch[1] : usdmEp.endpointDescription.split(/[,;:]|defined as/i)[0].trim();
        if (name.length > 50) name = name.substring(0, 47) + '...';
        
        if (!existingCTMS) {
          // Create new endpoint
          const newEndpoint: StudyEndpoint = {
            id: generateId('endpoint'),
            studyId,
            type: endpointType,
            category,
            name,
            fullDefinition: usdmEp.endpointDescription,
            assessmentMethod: 'Per protocol',
            assessmentTimepoint: 'Per protocol',
            status: 'pending',
            usdmSourceId: usdmEp.id,
            usdmVersionHash: versionHash,
            usdmSyncedAt: now,
            usdmSyncStatus: 'current',
          };
          newEndpoints.push(newEndpoint);
          result.created++;
        } else if (existingCTMS.usdmVersionHash !== versionHash) {
          // Update existing endpoint
          const idx = newEndpoints.findIndex(ep => ep.id === existingCTMS.id);
          if (idx !== -1) {
            newEndpoints[idx] = {
              ...existingCTMS,
              type: endpointType,
              category,
              name,
              fullDefinition: usdmEp.endpointDescription,
              usdmVersionHash: versionHash,
              usdmSyncedAt: now,
              usdmSyncStatus: 'current',
            };
          }
          result.updated++;
        } else {
          // No change needed, but update sync timestamp
          const idx = newEndpoints.findIndex(ep => ep.id === existingCTMS.id);
          if (idx !== -1) {
            newEndpoints[idx] = {
              ...existingCTMS,
              usdmSyncedAt: now,
              usdmSyncStatus: 'current',
            };
          }
          result.unchanged++;
        }
      } catch (error) {
        result.errors.push(`Failed to sync endpoint ${usdmEp.id}: ${error}`);
      }
    });
    
    set((state) => ({
      studyEndpoints: {
        ...state.studyEndpoints,
        [studyId]: newEndpoints,
      },
    }));
    
    return result;
  },

  // ==========================================================================
  // v204b: BIDIRECTIONAL SYNC WITH CONFLICT RESOLUTION
  // ==========================================================================

  executeBidirectionalSync: (studyId, config) => {
    const state = get();
    const now = new Date().toISOString();
    const ctmsEndpoints = state.studyEndpoints[studyId] || [];
    const localEdits = state.localEdits[studyId] || [];
    
    // For now, return a basic result - full implementation would integrate with USDM store
    const result: BidirectionalSyncResult = {
      direction: config.sourceOfTruth === 'usdm' ? 'usdm-to-ctms' : 
                 config.sourceOfTruth === 'ctms' ? 'ctms-to-usdm' : 'bidirectional',
      success: true,
      usdmToCTMS: { created: 0, updated: 0, unchanged: ctmsEndpoints.length },
      ctmsToUSDM: { created: 0, updated: 0, unchanged: ctmsEndpoints.length },
      conflicts: [],
      autoResolved: 0,
      pendingResolution: 0,
      syncedAt: now,
      errors: [],
    };
    
    // Detect conflicts by checking local edits against sync timestamps
    const conflicts: SyncConflict[] = [];
    ctmsEndpoints.forEach(ep => {
      if (ep.usdmSourceId && ep.hasLocalEdits) {
        // Check each edited field
        const epEdits = localEdits.filter(e => e.ctmsEndpointId === ep.id);
        epEdits.forEach(edit => {
          if (new Date(edit.editedAt) > new Date(ep.usdmSyncedAt || 0)) {
            conflicts.push({
              id: generateId('conflict'),
              usdmEndpointId: ep.usdmSourceId!,
              ctmsEndpointId: ep.id,
              field: edit.field,
              usdmValue: edit.previousValue, // This would come from USDM in real implementation
              ctmsValue: edit.newValue,
              usdmUpdatedAt: ep.usdmSyncedAt || now,
              ctmsUpdatedAt: edit.editedAt,
              detectedAt: now,
              resolution: null,
            });
          }
        });
      }
    });
    
    // Auto-resolve minor conflicts if configured
    let autoResolved = 0;
    let pendingConflicts: SyncConflict[] = [];
    
    if (config.autoResolveMinorChanges) {
      conflicts.forEach(conflict => {
        // Minor change: whitespace or case differences
        const usdmNorm = conflict.usdmValue.trim().toLowerCase();
        const ctmsNorm = conflict.ctmsValue.trim().toLowerCase();
        if (usdmNorm === ctmsNorm) {
          conflict.resolution = config.defaultResolution;
          conflict.resolvedAt = now;
          conflict.resolvedValue = config.defaultResolution === 'source-wins' ? 
            conflict.usdmValue : conflict.ctmsValue;
          autoResolved++;
        } else {
          pendingConflicts.push(conflict);
        }
      });
    } else {
      pendingConflicts = conflicts;
    }
    
    result.conflicts = conflicts;
    result.autoResolved = autoResolved;
    result.pendingResolution = pendingConflicts.length;
    result.success = pendingConflicts.length === 0;
    
    // Update state
    set((state) => ({
      lastSyncResults: {
        ...state.lastSyncResults,
        [studyId]: result,
      },
      pendingConflicts: {
        ...state.pendingConflicts,
        [studyId]: pendingConflicts,
      },
    }));
    
    return result;
  },

  setSyncConfig: (studyId, config) => {
    set((state) => ({
      syncConfigs: {
        ...state.syncConfigs,
        [studyId]: {
          ...(state.syncConfigs[studyId] || {
            sourceOfTruth: 'usdm',
            defaultResolution: 'source-wins',
            autoResolveMinorChanges: true,
            trackLocalEdits: true,
          }),
          ...config,
        },
      },
    }));
  },

  getSyncConfig: (studyId) => {
    const state = get();
    return state.syncConfigs[studyId] || {
      sourceOfTruth: 'usdm',
      defaultResolution: 'source-wins',
      autoResolveMinorChanges: true,
      trackLocalEdits: true,
    };
  },

  recordLocalEdit: (endpointId, field, previousValue, newValue) => {
    const state = get();
    const now = new Date().toISOString();
    
    // Find the study this endpoint belongs to
    let studyId: string | null = null;
    Object.entries(state.studyEndpoints).forEach(([sId, endpoints]) => {
      if (endpoints.some(ep => ep.id === endpointId)) {
        studyId = sId;
      }
    });
    
    if (!studyId) return;
    
    const edit: CTMSLocalEdit = {
      ctmsEndpointId: endpointId,
      field,
      previousValue,
      newValue,
      editedAt: now,
    };
    
    set((state) => {
      // Update local edits
      const studyEdits = state.localEdits[studyId!] || [];
      
      // Also mark the endpoint as having local edits
      const endpoints = state.studyEndpoints[studyId!] || [];
      const updatedEndpoints = endpoints.map(ep => {
        if (ep.id === endpointId) {
          return {
            ...ep,
            hasLocalEdits: true,
            ctmsLastEditedAt: now,
          };
        }
        return ep;
      });
      
      return {
        localEdits: {
          ...state.localEdits,
          [studyId!]: [...studyEdits, edit],
        },
        studyEndpoints: {
          ...state.studyEndpoints,
          [studyId!]: updatedEndpoints,
        },
      };
    });
  },

  resolveConflict: (conflictId, resolution, manualValue) => {
    const state = get();
    const now = new Date().toISOString();
    
    // Find and update the conflict
    Object.entries(state.pendingConflicts).forEach(([studyId, conflicts]) => {
      const conflict = conflicts.find(c => c.id === conflictId);
      if (conflict) {
        let resolvedValue: string;
        switch (resolution) {
          case 'source-wins':
            resolvedValue = conflict.usdmValue;
            break;
          case 'target-wins':
            resolvedValue = conflict.ctmsValue;
            break;
          case 'newest-wins':
            resolvedValue = new Date(conflict.usdmUpdatedAt) > new Date(conflict.ctmsUpdatedAt) ?
              conflict.usdmValue : conflict.ctmsValue;
            break;
          case 'manual':
            resolvedValue = manualValue || conflict.usdmValue;
            break;
          default:
            resolvedValue = conflict.usdmValue;
        }
        
        set((state) => ({
          pendingConflicts: {
            ...state.pendingConflicts,
            [studyId]: state.pendingConflicts[studyId].map(c =>
              c.id === conflictId ? {
                ...c,
                resolution,
                resolvedValue,
                resolvedAt: now,
              } : c
            ).filter(c => c.id !== conflictId), // Remove resolved conflict
          },
        }));
        
        // Apply the resolution to the endpoint if target-wins or manual
        if (resolution === 'target-wins' || resolution === 'manual') {
          // Update would be applied here
        }
      }
    });
  },

  getPendingConflicts: (studyId) => {
    const state = get();
    return state.pendingConflicts[studyId] || [];
  },

  clearLocalEdits: (studyId) => {
    set((state) => {
      // Clear local edits
      const { [studyId]: _, ...remainingEdits } = state.localEdits;
      
      // Reset hasLocalEdits flag on endpoints
      const endpoints = state.studyEndpoints[studyId] || [];
      const updatedEndpoints = endpoints.map(ep => ({
        ...ep,
        hasLocalEdits: false,
        ctmsLastEditedAt: undefined,
      }));
      
      return {
        localEdits: remainingEdits,
        studyEndpoints: {
          ...state.studyEndpoints,
          [studyId]: updatedEndpoints,
        },
      };
    });
  },

  // ==========================================================================
  // SITE MANAGEMENT
  // ==========================================================================

  addSite: (studyId, siteData) => {
    const id = generateId('site');
    const now = new Date().toISOString();

    const site: ClinicalSite = {
      id,
      studyId,
      siteNumber: siteData.siteNumber || `SITE-${Date.now().toString().slice(-6)}`,
      name: siteData.name || 'New Site',
      institutionType: siteData.institutionType || 'academic-medical-center',
      address: siteData.address || {
        line1: '',
        city: '',
        postalCode: '',
        country: '',
        countryCode: '',
        region: '',
      },
      status: 'identified',
      statusDate: now,
      statusHistory: [{
        id: generateId('status'),
        fromStatus: null,
        toStatus: 'identified',
        date: now,
        performedBy: 'System',
      }],
      principalInvestigator: siteData.principalInvestigator || {
        id: generateId('inv'),
        name: '',
        credentials: '',
        email: '',
        cv1572Status: 'pending',
        financialDisclosureStatus: 'pending',
      },
      subInvestigators: siteData.subInvestigators || [],
      studyCoordinator: siteData.studyCoordinator || {
        id: generateId('contact'),
        name: '',
        role: 'Study Coordinator',
        email: '',
      },
      targetEnrollment: siteData.targetEnrollment || 0,
      enrolledSubjects: 0,
      activeSubjects: 0,
      completedSubjects: 0,
      screenFailures: 0,
      discontinuedSubjects: 0,
      screeningRate: 0,
      screenFailureRate: 0,
      enrollmentRate: 0,
      queryRate: 0,
      protocolDeviationRate: 0,
      dataEntryLag: 0,
      documentsRequired: 0,
      documentsReceived: 0,
      documentsApproved: 0,
      monitoringVisitFrequency: 'monthly',
      riskScore: 'low',
      riskFactors: [],
      contractStatus: 'draft',
      budgetStatus: 'draft',
      paymentsToDate: 0,
      budgetedAmount: 0,
      ...siteData,
    };

    set((state) => {
      // Update study's site count
      const study = state.studies[studyId];
      const updatedStudies = study
        ? {
            ...state.studies,
            [studyId]: {
              ...study,
              totalSites: study.totalSites + 1,
              updatedAt: now,
            },
          }
        : state.studies;

      return {
        sites: { ...state.sites, [id]: site },
        sitesByStudy: {
          ...state.sitesByStudy,
          [studyId]: [...(state.sitesByStudy[studyId] || []), id],
        },
        studies: updatedStudies,
      };
    });

    return site;
  },

  updateSite: (siteId, updates) => {
    set((state) => {
      const existing = state.sites[siteId];
      if (!existing) return state;

      return {
        sites: {
          ...state.sites,
          [siteId]: { ...existing, ...updates },
        },
      };
    });
  },

  updateSiteStatus: (siteId, newStatus, reason) => {
    const now = new Date().toISOString();

    set((state) => {
      const site = state.sites[siteId];
      if (!site) return state;

      const statusChange = {
        id: generateId('status'),
        fromStatus: site.status,
        toStatus: newStatus,
        date: now,
        reason,
        performedBy: 'User',
      };

      // Update study's active site count if status changes to/from active statuses
      const wasActive = ['activated', 'enrolling', 'active-not-enrolling'].includes(site.status);
      const isActive = ['activated', 'enrolling', 'active-not-enrolling'].includes(newStatus);
      
      let updatedStudies = state.studies;
      const study = state.studies[site.studyId];
      if (study && wasActive !== isActive) {
        updatedStudies = {
          ...state.studies,
          [site.studyId]: {
            ...study,
            activeSites: isActive ? study.activeSites + 1 : study.activeSites - 1,
            updatedAt: now,
          },
        };
      }

      return {
        sites: {
          ...state.sites,
          [siteId]: {
            ...site,
            status: newStatus,
            statusDate: now,
            statusHistory: [...site.statusHistory, statusChange],
          },
        },
        studies: updatedStudies,
      };
    });
  },

  removeSite: (siteId) => {
    set((state) => {
      const site = state.sites[siteId];
      if (!site) return state;

      const { [siteId]: deleted, ...remainingSites } = state.sites;
      const now = new Date().toISOString();

      // Update study counts
      const study = state.studies[site.studyId];
      const wasActive = ['activated', 'enrolling', 'active-not-enrolling'].includes(site.status);
      const updatedStudies = study
        ? {
            ...state.studies,
            [site.studyId]: {
              ...study,
              totalSites: study.totalSites - 1,
              activeSites: wasActive ? study.activeSites - 1 : study.activeSites,
              updatedAt: now,
            },
          }
        : state.studies;

      return {
        sites: remainingSites,
        sitesByStudy: {
          ...state.sitesByStudy,
          [site.studyId]: (state.sitesByStudy[site.studyId] || []).filter((id) => id !== siteId),
        },
        studies: updatedStudies,
        selectedSiteId: state.selectedSiteId === siteId ? null : state.selectedSiteId,
      };
    });
  },

  // ==========================================================================
  // ENROLLMENT
  // ==========================================================================

  updateEnrollment: (studyId, tracking) => {
    set((state) => ({
      enrollmentTracking: {
        ...state.enrollmentTracking,
        [studyId]: {
          ...(state.enrollmentTracking[studyId] || {
            studyId,
            asOfDate: new Date().toISOString(),
            targetEnrollment: 0,
            screened: 0,
            screenFailed: 0,
            enrolled: 0,
            randomized: 0,
            onTreatment: 0,
            completed: 0,
            discontinued: 0,
            screenFailureRate: 0,
            discontinuationRate: 0,
            enrollmentRate: 0,
            projectedCompletionDate: '',
            projectedLastPatientIn: '',
            enrollmentVsTarget: 0,
            byArm: [],
            byRegion: [],
            weeklyTrend: [],
            monthlyTrend: [],
          }),
          ...tracking,
          asOfDate: new Date().toISOString(),
        },
      },
    }));
  },

  recordScreening: (studyId, siteId, count) => {
    const now = new Date().toISOString();

    set((state) => {
      // Update site
      const site = state.sites[siteId];
      const updatedSites = site
        ? {
            ...state.sites,
            [siteId]: {
              ...site,
              screeningRate: site.screeningRate + count,
            },
          }
        : state.sites;

      // Update enrollment tracking
      const tracking = state.enrollmentTracking[studyId];
      const updatedTracking = tracking
        ? {
            ...state.enrollmentTracking,
            [studyId]: {
              ...tracking,
              screened: tracking.screened + count,
              asOfDate: now,
            },
          }
        : state.enrollmentTracking;

      return {
        sites: updatedSites,
        enrollmentTracking: updatedTracking,
      };
    });
  },

  recordEnrollment: (studyId, siteId, count) => {
    const now = new Date().toISOString();

    set((state) => {
      // Update site
      const site = state.sites[siteId];
      const updatedSites = site
        ? {
            ...state.sites,
            [siteId]: {
              ...site,
              enrolledSubjects: site.enrolledSubjects + count,
              activeSubjects: site.activeSubjects + count,
            },
          }
        : state.sites;

      // Update study
      const study = state.studies[studyId];
      const updatedStudies = study
        ? {
            ...state.studies,
            [studyId]: {
              ...study,
              enrolledSubjects: study.enrolledSubjects + count,
              updatedAt: now,
            },
          }
        : state.studies;

      // Update enrollment tracking
      const tracking = state.enrollmentTracking[studyId];
      const newEnrolled = (tracking?.enrolled || 0) + count;
      const target = tracking?.targetEnrollment || study?.targetEnrollment || 0;
      const updatedTracking = {
        ...state.enrollmentTracking,
        [studyId]: {
          ...(tracking || {
            studyId,
            targetEnrollment: target,
            screened: 0,
            screenFailed: 0,
            enrolled: 0,
            randomized: 0,
            onTreatment: 0,
            completed: 0,
            discontinued: 0,
            screenFailureRate: 0,
            discontinuationRate: 0,
            enrollmentRate: 0,
            projectedCompletionDate: '',
            projectedLastPatientIn: '',
            enrollmentVsTarget: 0,
            byArm: [],
            byRegion: [],
            weeklyTrend: [],
            monthlyTrend: [],
          }),
          enrolled: newEnrolled,
          onTreatment: (tracking?.onTreatment || 0) + count,
          enrollmentVsTarget: target > 0 ? Math.round((newEnrolled / target) * 100) : 0,
          asOfDate: now,
        },
      };

      return {
        sites: updatedSites,
        studies: updatedStudies,
        enrollmentTracking: updatedTracking,
      };
    });
  },

  recordDiscontinuation: (studyId, siteId, count, reason) => {
    set((state) => {
      // Update site
      const site = state.sites[siteId];
      const updatedSites = site
        ? {
            ...state.sites,
            [siteId]: {
              ...site,
              activeSubjects: Math.max(0, site.activeSubjects - count),
              discontinuedSubjects: site.discontinuedSubjects + count,
            },
          }
        : state.sites;

      // Update enrollment tracking
      const tracking = state.enrollmentTracking[studyId];
      const updatedTracking = tracking
        ? {
            ...state.enrollmentTracking,
            [studyId]: {
              ...tracking,
              onTreatment: Math.max(0, tracking.onTreatment - count),
              discontinued: tracking.discontinued + count,
              discontinuationRate:
                tracking.enrolled > 0
                  ? Math.round(((tracking.discontinued + count) / tracking.enrolled) * 100)
                  : 0,
              asOfDate: new Date().toISOString(),
            },
          }
        : state.enrollmentTracking;

      return {
        sites: updatedSites,
        enrollmentTracking: updatedTracking,
      };
    });
  },

  generateEnrollmentForecast: (studyId) => {
    const state = get();
    const study = state.studies[studyId];
    const tracking = state.enrollmentTracking[studyId];

    if (!study) {
      throw new Error(`Study ${studyId} not found`);
    }

    const now = new Date();
    const enrolled = tracking?.enrolled || study.enrolledSubjects || 0;
    const target = study.targetEnrollment;
    const rate = tracking?.enrollmentRate || 5; // default 5 per week

    const remaining = Math.max(0, target - enrolled);
    const weeksToComplete = rate > 0 ? Math.ceil(remaining / rate) : 52;
    
    const predictedCompletion = new Date(now);
    predictedCompletion.setDate(predictedCompletion.getDate() + weeksToComplete * 7);

    const optimistic = new Date(predictedCompletion);
    optimistic.setDate(optimistic.getDate() - Math.round(weeksToComplete * 7 * 0.2));

    const pessimistic = new Date(predictedCompletion);
    pessimistic.setDate(pessimistic.getDate() + Math.round(weeksToComplete * 7 * 0.3));

    const forecast: EnrollmentForecast = {
      id: generateId('forecast'),
      studyId,
      createdAt: now.toISOString(),
      model: 'linear',
      predictedCompletionDate: predictedCompletion.toISOString().split('T')[0],
      confidenceInterval: {
        lower: optimistic.toISOString().split('T')[0],
        upper: pessimistic.toISOString().split('T')[0],
      },
      predictedFinalEnrollment: target,
      optimisticCompletion: optimistic.toISOString().split('T')[0],
      pessimisticCompletion: pessimistic.toISOString().split('T')[0],
      recommendations: remaining > 0
        ? [
            `Current enrollment rate: ${rate} subjects/week`,
            `Remaining to enroll: ${remaining} subjects`,
            remaining > rate * 12 ? 'Consider adding more sites to meet timeline' : 'On track to meet enrollment target',
          ]
        : ['Enrollment complete'],
    };

    set((state) => ({
      enrollmentForecasts: {
        ...state.enrollmentForecasts,
        [studyId]: forecast,
      },
    }));

    return forecast;
  },

  // ==========================================================================
  // VISIT SCHEDULING
  // ==========================================================================

  createVisitSchedule: (studyId, scheduleData) => {
    const id = generateId('schedule');
    const now = new Date().toISOString();

    const schedule: VisitSchedule = {
      id,
      studyId,
      visits: scheduleData.visits || [],
      createdAt: now,
      updatedAt: now,
      version: scheduleData.version || '1.0',
      effectiveDate: scheduleData.effectiveDate || now.split('T')[0],
    };

    set((state) => ({
      visitSchedules: { ...state.visitSchedules, [studyId]: schedule },
    }));

    return schedule;
  },

  addVisitDefinition: (scheduleId, visitData) => {
    const id = generateId('visit');

    const visit: VisitDefinition = {
      id,
      visitNumber: visitData.visitNumber || '1',
      visitName: visitData.visitName || 'New Visit',
      visitType: visitData.visitType || 'treatment',
      targetDay: visitData.targetDay || 1,
      windowBefore: visitData.windowBefore || 3,
      windowAfter: visitData.windowAfter || 3,
      windowUnit: visitData.windowUnit || 'days',
      isMandatory: visitData.isMandatory ?? true,
      allowsRemote: visitData.allowsRemote ?? false,
      requiresFasting: visitData.requiresFasting ?? false,
      estimatedDuration: visitData.estimatedDuration || 60,
      procedures: visitData.procedures || [],
      requiredForms: visitData.requiredForms || [],
      ...visitData,
    };

    set((state) => {
      // Find the schedule by ID (scheduleId is actually studyId here based on storage)
      const schedule = Object.values(state.visitSchedules).find((s) => s.id === scheduleId);
      if (!schedule) return state;

      return {
        visitSchedules: {
          ...state.visitSchedules,
          [schedule.studyId]: {
            ...schedule,
            visits: [...schedule.visits, visit],
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });

    return visit;
  },

  updateVisitDefinition: (scheduleId, visitId, updates) => {
    set((state) => {
      const schedule = Object.values(state.visitSchedules).find((s) => s.id === scheduleId);
      if (!schedule) return state;

      return {
        visitSchedules: {
          ...state.visitSchedules,
          [schedule.studyId]: {
            ...schedule,
            visits: schedule.visits.map((v) =>
              v.id === visitId ? { ...v, ...updates } : v
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  scheduleSubjectVisit: (subjectId, visitDefId, scheduledDate) => {
    const id = generateId('subj-visit');

    const visit: SubjectVisit = {
      id,
      subjectId,
      studyId: '',
      siteId: '',
      visitDefinitionId: visitDefId,
      visitNumber: '',
      visitName: '',
      scheduledDate,
      windowStart: scheduledDate,
      windowEnd: scheduledDate,
      status: 'scheduled',
      completionPercentage: 0,
      proceduresCompleted: [],
      proceduresMissed: [],
      dataEntryStatus: 'pending',
      queriesOpen: 0,
    };

    set((state) => ({
      subjectVisits: {
        ...state.subjectVisits,
        [subjectId]: [...(state.subjectVisits[subjectId] || []), visit],
      },
    }));

    return visit;
  },

  completeSubjectVisit: (visitId, completedDate, procedures) => {
    set((state) => {
      // Find and update the visit across all subjects
      const updatedSubjectVisits = { ...state.subjectVisits };
      
      for (const subjectId of Object.keys(updatedSubjectVisits)) {
        const visits = updatedSubjectVisits[subjectId];
        const visitIndex = visits.findIndex((v) => v.id === visitId);
        
        if (visitIndex >= 0) {
          updatedSubjectVisits[subjectId] = visits.map((v, i) =>
            i === visitIndex
              ? {
                  ...v,
                  actualDate: completedDate,
                  status: 'completed' as const,
                  completionPercentage: 100,
                  proceduresCompleted: procedures,
                }
              : v
          );
          break;
        }
      }

      return { subjectVisits: updatedSubjectVisits };
    });
  },

  // ==========================================================================
  // PROTOCOL DEVIATIONS
  // ==========================================================================

  reportDeviation: (deviationData) => {
    const id = generateId('deviation');
    const now = new Date().toISOString();

    const deviation: ProtocolDeviation = {
      id,
      studyId: deviationData.studyId || '',
      siteId: deviationData.siteId || '',
      category: deviationData.category || 'other',
      severity: deviationData.severity || 'minor',
      isImportant: deviationData.isImportant || false,
      title: deviationData.title || 'Protocol Deviation',
      description: deviationData.description || '',
      occurredDate: deviationData.occurredDate || now.split('T')[0],
      identifiedDate: deviationData.identifiedDate || now.split('T')[0],
      reportedDate: now.split('T')[0],
      status: 'identified',
      requiresCapa: deviationData.severity === 'critical' || deviationData.severity === 'major',
      reportedToIrb: false,
      reportedToSponsor: false,
      reportedToAuthority: false,
      identifiedBy: deviationData.identifiedBy || 'User',
      isRecurrent: false,
      ...deviationData,
    };

    set((state) => {
      // Update site deviation rate
      const site = state.sites[deviation.siteId];
      const updatedSites = site
        ? {
            ...state.sites,
            [deviation.siteId]: {
              ...site,
              protocolDeviationRate: site.protocolDeviationRate + 1,
            },
          }
        : state.sites;

      return {
        protocolDeviations: { ...state.protocolDeviations, [id]: deviation },
        deviationsByStudy: {
          ...state.deviationsByStudy,
          [deviation.studyId]: [...(state.deviationsByStudy[deviation.studyId] || []), id],
        },
        sites: updatedSites,
      };
    });

    // Emit cross-module event
    useCrossModuleStore.getState().emitEvent({
      eventType: 'deviation-detected',
      sourceModule: 'ctms',
      targetModules: ['quality', 'tmf'],
      entityType: 'deviation',
      entityId: id,
      description: `Protocol deviation: ${deviation.category} (${deviation.severity})`,
      payload: { studyId: deviation.studyId, category: deviation.category, severity: deviation.severity },
    });

    return deviation;
  },

  updateDeviation: (deviationId, updates) => {
    set((state) => {
      const existing = state.protocolDeviations[deviationId];
      if (!existing) return state;

      return {
        protocolDeviations: {
          ...state.protocolDeviations,
          [deviationId]: { ...existing, ...updates },
        },
      };
    });
  },

  closeDeviation: (deviationId, resolution) => {
    set((state) => {
      const existing = state.protocolDeviations[deviationId];
      if (!existing) return state;

      return {
        protocolDeviations: {
          ...state.protocolDeviations,
          [deviationId]: {
            ...existing,
            status: 'closed',
            closedDate: new Date().toISOString().split('T')[0],
            correctiveAction: resolution,
          },
        },
      };
    });
  },

  generateDeviationSummary: (studyId) => {
    const state = get();
    const deviationIds = state.deviationsByStudy[studyId] || [];
    const deviations = deviationIds.map((id) => state.protocolDeviations[id]).filter(Boolean);

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const bySiteMap: Record<string, { count: number; name: string }> = {};

    for (const dev of deviations) {
      byCategory[dev.category] = (byCategory[dev.category] || 0) + 1;
      bySeverity[dev.severity] = (bySeverity[dev.severity] || 0) + 1;
      byStatus[dev.status] = (byStatus[dev.status] || 0) + 1;
      
      if (dev.siteId) {
        const site = state.sites[dev.siteId];
        if (!bySiteMap[dev.siteId]) {
          bySiteMap[dev.siteId] = { count: 0, name: site?.name || dev.siteId };
        }
        bySiteMap[dev.siteId].count++;
      }
    }

    const summary: DeviationSummary = {
      studyId,
      totalDeviations: deviations.length,
      byCategory: byCategory as any,
      bySeverity: bySeverity as any,
      byStatus: byStatus as any,
      bySite: Object.entries(bySiteMap).map(([siteId, data]) => ({
        siteId,
        siteName: data.name,
        count: data.count,
        rate: 0, // Would need enrollment data
      })),
      importantDeviations: deviations.filter((d) => d.isImportant).length,
      openDeviations: deviations.filter((d) => d.status !== 'closed').length,
      recurrentPatterns: [], // Would need pattern analysis
      trendsOverTime: [], // Would need time series
    };

    set((state) => ({
      deviationSummaries: { ...state.deviationSummaries, [studyId]: summary },
    }));

    return summary;
  },

  // ==========================================================================
  // MONITORING
  // ==========================================================================

  scheduleMonitoringVisit: (visitData) => {
    const id = generateId('mon-visit');

    const visit: MonitoringVisit = {
      id,
      studyId: visitData.studyId || '',
      siteId: visitData.siteId || '',
      visitType: visitData.visitType || 'routine',
      plannedDate: visitData.plannedDate || new Date().toISOString().split('T')[0],
      status: 'planned',
      monitorId: visitData.monitorId || '',
      monitorName: visitData.monitorName || '',
      subjectsReviewed: 0,
      totalActiveSubjects: visitData.totalActiveSubjects || 0,
      sdvPercentage: 0,
      findingsCount: 0,
      criticalFindings: 0,
      majorFindings: 0,
      minorFindings: 0,
      findings: [],
      followUpRequired: false,
      followUpItems: [],
      reportStatus: 'draft',
      ...visitData,
    };

    set((state) => ({
      monitoringVisits: { ...state.monitoringVisits, [id]: visit },
      monitoringBySite: {
        ...state.monitoringBySite,
        [visit.siteId]: [...(state.monitoringBySite[visit.siteId] || []), id],
      },
    }));

    return visit;
  },

  updateMonitoringVisit: (visitId, updates) => {
    set((state) => {
      const existing = state.monitoringVisits[visitId];
      if (!existing) return state;

      return {
        monitoringVisits: {
          ...state.monitoringVisits,
          [visitId]: { ...existing, ...updates },
        },
      };
    });
  },

  completeMonitoringVisit: (visitId, findings) => {
    const now = new Date().toISOString();
    const visit = get().monitoringVisits[visitId];

    set((state) => {
      const existing = state.monitoringVisits[visitId];
      if (!existing) return state;

      const criticalCount = findings.filter((f) => f.severity === 'critical').length;
      const majorCount = findings.filter((f) => f.severity === 'major').length;
      const minorCount = findings.filter((f) => f.severity === 'minor').length;

      // Update site's last monitoring visit
      const updatedSites = existing.siteId && state.sites[existing.siteId]
        ? {
            ...state.sites,
            [existing.siteId]: {
              ...state.sites[existing.siteId],
              lastMonitoringVisit: now.split('T')[0],
            },
          }
        : state.sites;

      return {
        monitoringVisits: {
          ...state.monitoringVisits,
          [visitId]: {
            ...existing,
            status: 'completed',
            actualEndDate: now,
            findings,
            findingsCount: findings.length,
            criticalFindings: criticalCount,
            majorFindings: majorCount,
            minorFindings: minorCount,
            followUpRequired: criticalCount > 0 || majorCount > 0,
            reportStatus: 'draft',
          },
        },
        sites: updatedSites,
      };
    });

    // v0.40.8: Auto-link monitoring visit report to TMF
    if (visit && typeof window !== 'undefined') {
      import('@/services/tmf-auto-link-service').then(({ tmfAutoLinkService }) => {
        tmfAutoLinkService.onMonitoringVisitComplete({
          visitId,
          studyId: visit.studyId,
          siteId: visit.siteId,
          visitType: visit.visitType,
          reportTitle: `${visit.visitType === 'site-initiation' ? 'SIV' : visit.visitType === 'closeout' ? 'COV' : 'MVR'} Report - ${visit.siteId}`,
          monitorName: visit.monitorName,
          visitDate: now,
        }).then(result => {
          if (result.success && result.artifact) {
            /* TMF visit auto-linked */
          }
        }).catch(err => {
          console.warn('[TMF Auto-Link] Failed to auto-link monitoring visit:', err);
        });
      }).catch(() => {
        // Service not available (SSR or build time)
      });
    }
  },

  addFollowUpItem: (visitId, itemData) => {
    const id = generateId('followup');

    const item: FollowUpItem = {
      id,
      description: itemData.description || '',
      assignedTo: itemData.assignedTo || '',
      dueDate: itemData.dueDate || '',
      status: 'open',
      ...itemData,
    };

    set((state) => {
      const visit = state.monitoringVisits[visitId];
      if (!visit) return state;

      return {
        monitoringVisits: {
          ...state.monitoringVisits,
          [visitId]: {
            ...visit,
            followUpItems: [...visit.followUpItems, item],
          },
        },
      };
    });
  },

  // ==========================================================================
  // METRICS
  // ==========================================================================

  calculateStudyMetrics: (studyId) => {
    const state = get();
    const study = state.studies[studyId];
    const tracking = state.enrollmentTracking[studyId];
    const siteIds = state.sitesByStudy[studyId] || [];
    const sites = siteIds.map((id) => state.sites[id]).filter(Boolean);
    const deviationIds = state.deviationsByStudy[studyId] || [];
    const deviations = deviationIds.map((id) => state.protocolDeviations[id]).filter(Boolean);

    if (!study) {
      throw new Error(`Study ${studyId} not found`);
    }

    const enrolled = tracking?.enrolled || study.enrolledSubjects || 0;
    const target = study.targetEnrollment;
    const activeSites = sites.filter((s) =>
      ['activated', 'enrolling', 'active-not-enrolling'].includes(s.status)
    );

    // Find top and bottom performers
    const sortedByEnrollment = [...sites].sort((a, b) => b.enrolledSubjects - a.enrolledSubjects);
    const topPerformer = sortedByEnrollment[0];
    const bottomPerformer = sortedByEnrollment[sortedByEnrollment.length - 1];

    // Calculate averages
    const avgQueryRate = sites.length > 0
      ? sites.reduce((sum, s) => sum + s.queryRate, 0) / sites.length
      : 0;
    const avgDataLag = sites.length > 0
      ? sites.reduce((sum, s) => sum + s.dataEntryLag, 0) / sites.length
      : 0;

    const metrics: CTMSStudyMetrics = {
      studyId,
      asOfDate: new Date().toISOString(),
      enrollmentMetrics: {
        target,
        enrolled,
        percentComplete: target > 0 ? Math.round((enrolled / target) * 100) : 0,
        enrollmentRate: tracking?.enrollmentRate || 0,
        projectedCompletion: tracking?.projectedCompletionDate || '',
        daysToTarget: 0, // Would calculate from projection
      },
      siteMetrics: {
        totalSites: sites.length,
        activeSites: activeSites.length,
        enrollingSites: sites.filter((s) => s.status === 'enrolling').length,
        topPerformer: topPerformer
          ? { siteId: topPerformer.id, siteName: topPerformer.name, enrolled: topPerformer.enrolledSubjects }
          : { siteId: '', siteName: 'N/A', enrolled: 0 },
        bottomPerformer: bottomPerformer
          ? { siteId: bottomPerformer.id, siteName: bottomPerformer.name, enrolled: bottomPerformer.enrolledSubjects }
          : { siteId: '', siteName: 'N/A', enrolled: 0 },
        avgEnrollmentPerSite: sites.length > 0
          ? Math.round(enrolled / sites.length)
          : 0,
      },
      dataQualityMetrics: {
        queryRate: Math.round(avgQueryRate * 10) / 10,
        queryResolutionTime: 5, // Default
        dataEntryLag: Math.round(avgDataLag * 10) / 10,
        missingDataRate: 0,
      },
      complianceMetrics: {
        deviationRate: enrolled > 0
          ? Math.round((deviations.length / enrolled) * 100 * 10) / 10
          : 0,
        importantDeviations: deviations.filter((d) => d.isImportant).length,
        screenFailureRate: tracking?.screenFailureRate || 0,
        discontinuationRate: tracking?.discontinuationRate || 0,
      },
      timelineMetrics: {
        studyStartDate: study.plannedStartDate,
        firstSubjectIn: study.firstSubjectIn || '',
        lastSubjectIn: study.lastSubjectIn,
        primaryCompletionDate: study.primaryCompletionDate,
        studyCompletionDate: study.studyCompletionDate,
        isOnSchedule: true, // Would need timeline comparison
        daysAheadBehind: 0,
      },
      riskScore: study.riskScore,
      riskIndicators: [
        {
          category: 'Enrollment',
          indicator: 'Enrollment Rate',
          status: enrolled >= target * 0.8 ? 'green' : enrolled >= target * 0.5 ? 'yellow' : 'red',
          value: `${Math.round((enrolled / target) * 100)}%`,
          threshold: '80%',
        },
        {
          category: 'Data Quality',
          indicator: 'Query Rate',
          status: avgQueryRate < 2 ? 'green' : avgQueryRate < 4 ? 'yellow' : 'red',
          value: `${avgQueryRate.toFixed(1)} per 100`,
          threshold: '< 2 per 100',
        },
        {
          category: 'Compliance',
          indicator: 'Deviation Rate',
          status: deviations.length < 5 ? 'green' : deviations.length < 10 ? 'yellow' : 'red',
          value: `${deviations.length} total`,
          threshold: '< 5',
        },
      ],
    };

    set((state) => ({
      studyMetrics: { ...state.studyMetrics, [studyId]: metrics },
    }));

    return metrics;
  },

  refreshAllMetrics: () => {
    const state = get();
    for (const studyId of Object.keys(state.studies)) {
      get().calculateStudyMetrics(studyId);
    }
  },

  // ==========================================================================
  // UI ACTIONS
  // ==========================================================================

  setSelectedStudy: (studyId) => {
    set({ selectedStudyId: studyId });
  },

  setSelectedSite: (siteId) => {
    set({ selectedSiteId: siteId });
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

  // ==========================================================================
  // MOCK DATA LOADING
  // ==========================================================================
  
  loadMockData: () => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    
    // Create mock studies
    const studies: Record<string, CTMSStudy> = {
      'study-001': {
        id: 'study-001',
        protocolNumber: 'LIG-2024-001',
        title: 'A Phase 3, Randomized, Double-Blind Study of LIG-101 in Patients with Advanced Solid Tumors',
        shortTitle: 'BEACON-3',
        productId: 'prod-001',
        productName: 'LIG-101',
        indication: 'Advanced Solid Tumors',
        phase: 'Phase 3',
        type: 'interventional',
        status: 'enrolling',
        sponsor: 'Ligature Pharmaceuticals',
        indNumber: 'IND-2024-0001',
        nctNumber: 'NCT05123456',
        eudractNumber: '2024-001234-56',
        medicalMonitor: 'Dr. Sarah Chen',
        projectManager: 'Michael Torres',
        dataManager: 'Emily Rodriguez',
        statistician: 'Dr. James Liu',
        plannedStartDate: '2024-01-15',
        actualStartDate: '2024-02-01',
        firstSubjectIn: '2024-03-15',
        targetEnrollment: 450,
        enrolledSubjects: 287,
        targetSites: 65,
        totalSites: 52,
        activeSites: 45,
        countries: ['USA', 'Germany', 'France', 'Japan', 'Canada', 'UK', 'Spain', 'Italy', 'Australia', 'Brazil'],
        regions: ['North America', 'Europe', 'Asia Pacific', 'Latin America'],
        riskScore: 'medium',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: now,
      },
      'study-002': {
        id: 'study-002',
        protocolNumber: 'LIG-2024-002',
        title: 'A Phase 2, Open-Label Study of LIG-205 in Treatment-Resistant Major Depressive Disorder',
        shortTitle: 'MINDFUL-2',
        productId: 'prod-002',
        productName: 'LIG-205',
        indication: 'Treatment-Resistant Depression',
        phase: 'Phase 2',
        type: 'interventional',
        status: 'enrolling',
        sponsor: 'Ligature Pharmaceuticals',
        indNumber: 'IND-2023-0078',
        nctNumber: 'NCT05234567',
        medicalMonitor: 'Dr. Jennifer Walsh',
        projectManager: 'David Kim',
        dataManager: 'Lisa Park',
        plannedStartDate: '2024-03-01',
        actualStartDate: '2024-04-15',
        firstSubjectIn: '2024-05-20',
        targetEnrollment: 180,
        enrolledSubjects: 94,
        targetSites: 25,
        totalSites: 22,
        activeSites: 18,
        countries: ['USA', 'Canada', 'Australia'],
        regions: ['North America', 'Asia Pacific'],
        riskScore: 'low',
        createdAt: '2024-02-15T00:00:00Z',
        updatedAt: now,
      },
      'study-003': {
        id: 'study-003',
        protocolNumber: 'LIG-2023-005',
        title: 'A Phase 1/2 Dose-Escalation Study of LIG-301 in Relapsed/Refractory Multiple Myeloma',
        shortTitle: 'SUMMIT-1',
        productId: 'prod-003',
        productName: 'LIG-301',
        indication: 'Multiple Myeloma',
        phase: 'Phase 1/2',
        type: 'interventional',
        status: 'active-follow-up',
        sponsor: 'Ligature Pharmaceuticals',
        cro: 'Parexel International',
        indNumber: 'IND-2023-0034',
        nctNumber: 'NCT05345678',
        medicalMonitor: 'Dr. Robert Martinez',
        projectManager: 'Amanda Chen',
        statistician: 'Dr. Wei Zhang',
        plannedStartDate: '2023-06-01',
        actualStartDate: '2023-07-15',
        firstSubjectIn: '2023-08-10',
        lastSubjectIn: '2024-10-30',
        targetEnrollment: 90,
        enrolledSubjects: 90,
        targetSites: 15,
        totalSites: 15,
        activeSites: 12,
        countries: ['USA', 'Germany', 'France'],
        regions: ['North America', 'Europe'],
        riskScore: 'low',
        createdAt: '2023-05-01T00:00:00Z',
        updatedAt: now,
      },
      'study-004': {
        id: 'study-004',
        protocolNumber: 'LIG-2024-007',
        title: 'A Phase 3, Multicenter Study of LIG-401 in Chronic Kidney Disease with Type 2 Diabetes',
        shortTitle: 'RENAL-PROTECT',
        productId: 'prod-004',
        productName: 'LIG-401',
        indication: 'Diabetic Nephropathy',
        phase: 'Phase 3',
        type: 'interventional',
        status: 'startup',
        sponsor: 'Ligature Pharmaceuticals',
        indNumber: 'IND-2024-0089',
        nctNumber: 'NCT05456789',
        medicalMonitor: 'Dr. Patricia Wong',
        projectManager: 'Thomas Anderson',
        plannedStartDate: '2024-09-01',
        targetEnrollment: 600,
        enrolledSubjects: 0,
        targetSites: 80,
        totalSites: 35,
        activeSites: 8,
        countries: ['USA', 'UK', 'Germany', 'Japan', 'South Korea', 'Brazil'],
        regions: ['North America', 'Europe', 'Asia Pacific', 'Latin America'],
        riskScore: 'high',
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: now,
      },
    };

    // Create mock sites
    const sites: Record<string, ClinicalSite> = {
      'site-001': {
        id: 'site-001',
        studyId: 'study-001',
        siteNumber: '001',
        name: 'Memorial Sloan Kettering Cancer Center',
        institutionType: 'cancer-center',
        address: {
          line1: '1275 York Avenue',
          city: 'New York',
          state: 'NY',
          postalCode: '10065',
          country: 'United States',
          countryCode: 'US',
          region: 'North America',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [
          { id: 'sh-1', fromStatus: null, toStatus: 'identified', date: '2024-01-20', performedBy: 'System' },
          { id: 'sh-2', fromStatus: 'identified', toStatus: 'selected', date: '2024-02-05', performedBy: 'M. Torres' },
          { id: 'sh-3', fromStatus: 'selected', toStatus: 'activated', date: '2024-03-01', performedBy: 'M. Torres' },
          { id: 'sh-4', fromStatus: 'activated', toStatus: 'enrolling', date: '2024-03-15', performedBy: 'M. Torres' },
        ],
        principalInvestigator: {
          id: 'pi-001',
          name: 'Dr. Elena Rodriguez',
          credentials: 'MD, PhD',
          email: 'e.rodriguez@mskcc.org',
          phone: '+1-212-639-2000',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          gcpTrainingDate: '2024-01-15',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-001',
          name: 'Jennifer Smith',
          role: 'Study Coordinator',
          email: 'j.smith@mskcc.org',
          phone: '+1-212-639-2001',
        },
        targetEnrollment: 25,
        enrolledSubjects: 21,
        activeSubjects: 18,
        completedSubjects: 3,
        screenFailures: 5,
        discontinuedSubjects: 0,
        screeningRate: 4.2,
        screenFailureRate: 19.2,
        enrollmentRate: 3.5,
        queryRate: 2.8,
        protocolDeviationRate: 1.2,
        dataEntryLag: 1.5,
        siteIdentifiedDate: '2024-01-20',
        siteSelectedDate: '2024-02-05',
        regulatoryApprovalDate: '2024-02-28',
        siteInitiationDate: '2024-03-01',
        firstSubjectScreenedDate: '2024-03-10',
        firstSubjectEnrolledDate: '2024-03-15',
        documentsRequired: 45,
        documentsReceived: 45,
        documentsApproved: 45,
        lastMonitoringVisit: '2024-11-15',
        nextMonitoringVisit: '2025-01-20',
        monitoringVisitFrequency: 'Monthly',
        riskScore: 'low',
        riskFactors: [],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 185000,
        budgetedAmount: 450000,
      },
      'site-002': {
        id: 'site-002',
        studyId: 'study-001',
        siteNumber: '002',
        name: 'MD Anderson Cancer Center',
        institutionType: 'cancer-center',
        address: {
          line1: '1515 Holcombe Boulevard',
          city: 'Houston',
          state: 'TX',
          postalCode: '77030',
          country: 'United States',
          countryCode: 'US',
          region: 'North America',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-002',
          name: 'Dr. Marcus Chen',
          credentials: 'MD',
          email: 'm.chen@mdanderson.org',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          gcpTrainingDate: '2024-01-10',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-002',
          name: 'Robert Johnson',
          role: 'Study Coordinator',
          email: 'r.johnson@mdanderson.org',
        },
        targetEnrollment: 20,
        enrolledSubjects: 18,
        activeSubjects: 15,
        completedSubjects: 2,
        screenFailures: 3,
        discontinuedSubjects: 1,
        screeningRate: 3.8,
        screenFailureRate: 14.3,
        enrollmentRate: 3.2,
        queryRate: 3.5,
        protocolDeviationRate: 2.1,
        dataEntryLag: 2.0,
        siteInitiationDate: '2024-03-05',
        firstSubjectEnrolledDate: '2024-03-20',
        documentsRequired: 45,
        documentsReceived: 44,
        documentsApproved: 43,
        lastMonitoringVisit: '2024-11-08',
        nextMonitoringVisit: '2025-01-15',
        monitoringVisitFrequency: 'Monthly',
        riskScore: 'medium',
        riskFactors: [
          { id: 'rf-1', category: 'quality', description: 'Elevated query rate', severity: 'low', status: 'open', identifiedDate: '2024-10-15' },
        ],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 162000,
        budgetedAmount: 400000,
      },
      'site-003': {
        id: 'site-003',
        studyId: 'study-001',
        siteNumber: '003',
        name: 'Charité - Universitätsmedizin Berlin',
        institutionType: 'academic-medical-center',
        address: {
          line1: 'Charitéplatz 1',
          city: 'Berlin',
          postalCode: '10117',
          country: 'Germany',
          countryCode: 'DE',
          region: 'Europe',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-003',
          name: 'Prof. Dr. Hans Mueller',
          credentials: 'MD, PhD',
          email: 'h.mueller@charite.de',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-003',
          name: 'Anna Schmidt',
          role: 'Study Coordinator',
          email: 'a.schmidt@charite.de',
        },
        targetEnrollment: 15,
        enrolledSubjects: 12,
        activeSubjects: 11,
        completedSubjects: 1,
        screenFailures: 4,
        discontinuedSubjects: 0,
        screeningRate: 2.5,
        screenFailureRate: 25.0,
        enrollmentRate: 2.0,
        queryRate: 4.2,
        protocolDeviationRate: 1.8,
        dataEntryLag: 3.5,
        siteInitiationDate: '2024-04-01',
        firstSubjectEnrolledDate: '2024-04-20',
        documentsRequired: 50,
        documentsReceived: 48,
        documentsApproved: 46,
        lastMonitoringVisit: '2024-10-20',
        nextMonitoringVisit: '2025-01-10',
        monitoringVisitFrequency: '6-8 weeks',
        riskScore: 'medium',
        riskFactors: [
          { id: 'rf-2', category: 'quality', description: 'Higher than average query rate', severity: 'medium', status: 'open', identifiedDate: '2024-09-01' },
          { id: 'rf-3', category: 'operational', description: 'Data entry lag exceeds target', severity: 'low', status: 'open', identifiedDate: '2024-09-15' },
        ],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 95000,
        budgetedAmount: 280000,
      },
      'site-004': {
        id: 'site-004',
        studyId: 'study-001',
        siteNumber: '004',
        name: 'National Cancer Center Hospital',
        institutionType: 'cancer-center',
        address: {
          line1: '5-1-1 Tsukiji',
          city: 'Tokyo',
          postalCode: '104-0045',
          country: 'Japan',
          countryCode: 'JP',
          region: 'Asia Pacific',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-004',
          name: 'Dr. Yuki Tanaka',
          credentials: 'MD, PhD',
          email: 'y.tanaka@ncc.go.jp',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-004',
          name: 'Kenji Yamamoto',
          role: 'Study Coordinator',
          email: 'k.yamamoto@ncc.go.jp',
        },
        targetEnrollment: 18,
        enrolledSubjects: 14,
        activeSubjects: 13,
        completedSubjects: 1,
        screenFailures: 2,
        discontinuedSubjects: 0,
        screeningRate: 2.8,
        screenFailureRate: 12.5,
        enrollmentRate: 2.5,
        queryRate: 1.8,
        protocolDeviationRate: 0.8,
        dataEntryLag: 1.0,
        siteInitiationDate: '2024-04-15',
        firstSubjectEnrolledDate: '2024-05-01',
        documentsRequired: 55,
        documentsReceived: 55,
        documentsApproved: 55,
        lastMonitoringVisit: '2024-11-01',
        nextMonitoringVisit: '2025-01-05',
        monitoringVisitFrequency: 'Monthly',
        riskScore: 'low',
        riskFactors: [],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 110000,
        budgetedAmount: 320000,
      },
      'site-005': {
        id: 'site-005',
        studyId: 'study-001',
        siteNumber: '005',
        name: 'Princess Margaret Cancer Centre',
        institutionType: 'cancer-center',
        address: {
          line1: '610 University Avenue',
          city: 'Toronto',
          state: 'ON',
          postalCode: 'M5G 2M9',
          country: 'Canada',
          countryCode: 'CA',
          region: 'North America',
        },
        status: 'in-startup',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-005',
          name: 'Dr. Sarah Thompson',
          credentials: 'MD',
          email: 's.thompson@uhn.ca',
          specialty: 'Medical Oncology',
          cv1572Status: 'pending',
          financialDisclosureStatus: 'pending',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-005',
          name: 'Mark Williams',
          role: 'Study Coordinator',
          email: 'm.williams@uhn.ca',
        },
        targetEnrollment: 12,
        enrolledSubjects: 0,
        activeSubjects: 0,
        completedSubjects: 0,
        screenFailures: 0,
        discontinuedSubjects: 0,
        screeningRate: 0,
        screenFailureRate: 0,
        enrollmentRate: 0,
        queryRate: 0,
        protocolDeviationRate: 0,
        dataEntryLag: 0,
        siteIdentifiedDate: '2024-08-01',
        siteSelectedDate: '2024-09-15',
        documentsRequired: 45,
        documentsReceived: 32,
        documentsApproved: 28,
        monitoringVisitFrequency: 'TBD',
        riskScore: 'medium',
        riskFactors: [
          { id: 'rf-4', category: 'operational', description: 'Startup documentation incomplete', severity: 'medium', status: 'open', identifiedDate: '2024-11-01' },
        ],
        contractStatus: 'negotiating',
        budgetStatus: 'draft',
        paymentsToDate: 0,
        budgetedAmount: 250000,
      },
      // v0.37.2: Additional sites for Country/Site Drill-Down demo
      'site-006': {
        id: 'site-006',
        studyId: 'study-001',
        siteNumber: '006',
        name: 'Royal Marsden Hospital',
        institutionType: 'cancer-center',
        address: {
          line1: '203 Fulham Road',
          city: 'London',
          state: '',
          postalCode: 'SW3 6JJ',
          country: 'United Kingdom',
          countryCode: 'GB',
          region: 'Europe',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-006',
          name: 'Prof. James Mitchell',
          credentials: 'MD, FRCP',
          email: 'j.mitchell@rmh.nhs.uk',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-006',
          name: 'Emma Davies',
          role: 'Study Coordinator',
          email: 'e.davies@rmh.nhs.uk',
        },
        targetEnrollment: 18,
        enrolledSubjects: 14,
        activeSubjects: 12,
        completedSubjects: 2,
        screenFailures: 3,
        discontinuedSubjects: 0,
        screeningRate: 3.2,
        screenFailureRate: 17.6,
        enrollmentRate: 2.8,
        queryRate: 1.5,
        protocolDeviationRate: 0.8,
        dataEntryLag: 1.2,
        siteIdentifiedDate: '2024-02-15',
        siteSelectedDate: '2024-03-01',
        documentsRequired: 45,
        documentsReceived: 45,
        documentsApproved: 45,
        monitoringVisitFrequency: '8 weeks',
        riskScore: 'low',
        riskFactors: [],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 145000,
        budgetedAmount: 320000,
      },
      'site-007': {
        id: 'site-007',
        studyId: 'study-001',
        siteNumber: '007',
        name: 'Institut Gustave Roussy',
        institutionType: 'cancer-center',
        address: {
          line1: '114 Rue Edouard Vaillant',
          city: 'Villejuif',
          state: '',
          postalCode: '94805',
          country: 'France',
          countryCode: 'FR',
          region: 'Europe',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-007',
          name: 'Dr. Marie Dupont',
          credentials: 'MD, PhD',
          email: 'm.dupont@gustaveroussy.fr',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-007',
          name: 'Sophie Laurent',
          role: 'Study Coordinator',
          email: 's.laurent@gustaveroussy.fr',
        },
        targetEnrollment: 20,
        enrolledSubjects: 16,
        activeSubjects: 14,
        completedSubjects: 2,
        screenFailures: 4,
        discontinuedSubjects: 0,
        screeningRate: 3.5,
        screenFailureRate: 20.0,
        enrollmentRate: 2.9,
        queryRate: 1.8,
        protocolDeviationRate: 1.0,
        dataEntryLag: 1.5,
        siteIdentifiedDate: '2024-02-01',
        siteSelectedDate: '2024-02-20',
        documentsRequired: 45,
        documentsReceived: 45,
        documentsApproved: 45,
        monitoringVisitFrequency: '8 weeks',
        riskScore: 'low',
        riskFactors: [],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 160000,
        budgetedAmount: 340000,
      },
      'site-008': {
        id: 'site-008',
        studyId: 'study-001',
        siteNumber: '008',
        name: 'Hospital Clinic Barcelona',
        institutionType: 'academic-medical-center',
        address: {
          line1: 'Carrer de Villarroel 170',
          city: 'Barcelona',
          state: '',
          postalCode: '08036',
          country: 'Spain',
          countryCode: 'ES',
          region: 'Europe',
        },
        status: 'activated',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-008',
          name: 'Dr. Carlos García',
          credentials: 'MD',
          email: 'c.garcia@clinic.cat',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-008',
          name: 'Ana Martínez',
          role: 'Study Coordinator',
          email: 'a.martinez@clinic.cat',
        },
        targetEnrollment: 15,
        enrolledSubjects: 3,
        activeSubjects: 3,
        completedSubjects: 0,
        screenFailures: 1,
        discontinuedSubjects: 0,
        screeningRate: 2.0,
        screenFailureRate: 25.0,
        enrollmentRate: 1.5,
        queryRate: 2.2,
        protocolDeviationRate: 0,
        dataEntryLag: 2.0,
        siteIdentifiedDate: '2024-05-01',
        siteSelectedDate: '2024-06-15',
        documentsRequired: 45,
        documentsReceived: 42,
        documentsApproved: 40,
        monitoringVisitFrequency: '8 weeks',
        riskScore: 'medium',
        riskFactors: [
          { id: 'rf-8', category: 'enrollment', description: 'Slow enrollment start', severity: 'medium', status: 'open', identifiedDate: '2024-11-15' },
        ],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 45000,
        budgetedAmount: 280000,
      },
      'site-009': {
        id: 'site-009',
        studyId: 'study-001',
        siteNumber: '009',
        name: 'Peter MacCallum Cancer Centre',
        institutionType: 'cancer-center',
        address: {
          line1: '305 Grattan Street',
          city: 'Melbourne',
          state: 'VIC',
          postalCode: '3000',
          country: 'Australia',
          countryCode: 'AU',
          region: 'Asia Pacific',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-009',
          name: 'Dr. Rebecca Chen',
          credentials: 'MBBS, FRACP',
          email: 'r.chen@petermac.org',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-009',
          name: 'Michael Brown',
          role: 'Study Coordinator',
          email: 'm.brown@petermac.org',
        },
        targetEnrollment: 16,
        enrolledSubjects: 11,
        activeSubjects: 10,
        completedSubjects: 1,
        screenFailures: 2,
        discontinuedSubjects: 0,
        screeningRate: 2.8,
        screenFailureRate: 15.4,
        enrollmentRate: 2.4,
        queryRate: 1.2,
        protocolDeviationRate: 0.5,
        dataEntryLag: 0.8,
        siteIdentifiedDate: '2024-03-01',
        siteSelectedDate: '2024-04-15',
        documentsRequired: 45,
        documentsReceived: 45,
        documentsApproved: 45,
        monitoringVisitFrequency: '8 weeks',
        riskScore: 'low',
        riskFactors: [],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 120000,
        budgetedAmount: 300000,
      },
      'site-010': {
        id: 'site-010',
        studyId: 'study-001',
        siteNumber: '010',
        name: 'Hospital Sírio-Libanês',
        institutionType: 'private-practice',
        address: {
          line1: 'Rua Dona Adma Jafet 91',
          city: 'São Paulo',
          state: 'SP',
          postalCode: '01308-050',
          country: 'Brazil',
          countryCode: 'BR',
          region: 'Latin America',
        },
        status: 'in-startup',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-010',
          name: 'Dr. Paulo Santos',
          credentials: 'MD, PhD',
          email: 'p.santos@hsl.org.br',
          specialty: 'Medical Oncology',
          cv1572Status: 'pending',
          financialDisclosureStatus: 'pending',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-010',
          name: 'Lucia Fernandes',
          role: 'Study Coordinator',
          email: 'l.fernandes@hsl.org.br',
        },
        targetEnrollment: 12,
        enrolledSubjects: 0,
        activeSubjects: 0,
        completedSubjects: 0,
        screenFailures: 0,
        discontinuedSubjects: 0,
        screeningRate: 0,
        screenFailureRate: 0,
        enrollmentRate: 0,
        queryRate: 0,
        protocolDeviationRate: 0,
        dataEntryLag: 0,
        siteIdentifiedDate: '2024-08-15',
        siteSelectedDate: '2024-10-01',
        documentsRequired: 45,
        documentsReceived: 28,
        documentsApproved: 22,
        monitoringVisitFrequency: 'TBD',
        riskScore: 'high',
        riskFactors: [
          { id: 'rf-10a', category: 'regulatory', description: 'ANVISA approval pending', severity: 'high', status: 'open', identifiedDate: '2024-10-15' },
          { id: 'rf-10b', category: 'operational', description: 'Import license in progress', severity: 'medium', status: 'open', identifiedDate: '2024-10-20' },
        ],
        contractStatus: 'negotiating',
        budgetStatus: 'draft',
        paymentsToDate: 0,
        budgetedAmount: 260000,
      },
      'site-011': {
        id: 'site-011',
        studyId: 'study-001',
        siteNumber: '011',
        name: 'University Hospital Essen',
        institutionType: 'academic-medical-center',
        address: {
          line1: 'Hufelandstraße 55',
          city: 'Essen',
          state: '',
          postalCode: '45147',
          country: 'Germany',
          countryCode: 'DE',
          region: 'Europe',
        },
        status: 'enrolling',
        statusDate: today,
        statusHistory: [],
        principalInvestigator: {
          id: 'pi-011',
          name: 'Prof. Klaus Weber',
          credentials: 'MD',
          email: 'k.weber@uk-essen.de',
          specialty: 'Medical Oncology',
          cv1572Status: 'current',
          financialDisclosureStatus: 'submitted',
        },
        subInvestigators: [],
        studyCoordinator: {
          id: 'sc-011',
          name: 'Katrin Hoffmann',
          role: 'Study Coordinator',
          email: 'k.hoffmann@uk-essen.de',
        },
        targetEnrollment: 14,
        enrolledSubjects: 9,
        activeSubjects: 8,
        completedSubjects: 1,
        screenFailures: 2,
        discontinuedSubjects: 0,
        screeningRate: 2.5,
        screenFailureRate: 18.2,
        enrollmentRate: 2.0,
        queryRate: 1.4,
        protocolDeviationRate: 0.6,
        dataEntryLag: 1.0,
        siteIdentifiedDate: '2024-02-20',
        siteSelectedDate: '2024-03-15',
        documentsRequired: 45,
        documentsReceived: 45,
        documentsApproved: 45,
        monitoringVisitFrequency: '8 weeks',
        riskScore: 'low',
        riskFactors: [],
        contractStatus: 'executed',
        budgetStatus: 'approved',
        paymentsToDate: 95000,
        budgetedAmount: 280000,
      },
    };

    // Create enrollment tracking
    const enrollmentTracking: Record<string, EnrollmentTracking> = {
      'study-001': {
        studyId: 'study-001',
        asOfDate: today,
        targetEnrollment: 450,
        screened: 368,
        screenFailed: 81,
        enrolled: 287,
        randomized: 280,
        onTreatment: 245,
        completed: 28,
        discontinued: 7,
        screenFailureRate: 22.0,
        discontinuationRate: 2.4,
        enrollmentRate: 12.5,
        projectedCompletionDate: '2025-08-15',
        projectedLastPatientIn: '2025-04-30',
        enrollmentVsTarget: 63.8,
        byArm: [
          { armId: 'arm-1', armName: 'LIG-101 + SOC', target: 300, enrolled: 192, percentComplete: 64 },
          { armId: 'arm-2', armName: 'Placebo + SOC', target: 150, enrolled: 95, percentComplete: 63 },
        ],
        byRegion: [
          { region: 'North America', siteCount: 28, activeSites: 25, target: 225, enrolled: 156, percentComplete: 69, enrollmentRate: 7.2 },
          { region: 'Europe', siteCount: 18, activeSites: 15, target: 135, enrolled: 82, percentComplete: 61, enrollmentRate: 3.8 },
          { region: 'Asia Pacific', siteCount: 6, activeSites: 5, target: 90, enrolled: 49, percentComplete: 54, enrollmentRate: 1.5 },
        ],
        weeklyTrend: [
          { date: '2024-11-04', target: 440, actual: 275, screened: 352, cumulative: 275 },
          { date: '2024-11-11', target: 443, actual: 280, screened: 358, cumulative: 280 },
          { date: '2024-11-18', target: 446, actual: 283, screened: 364, cumulative: 283 },
          { date: '2024-11-25', target: 448, actual: 285, screened: 366, cumulative: 285 },
          { date: '2024-12-02', target: 450, actual: 287, screened: 368, cumulative: 287 },
        ],
        monthlyTrend: [],
      },
      'study-002': {
        studyId: 'study-002',
        asOfDate: today,
        targetEnrollment: 180,
        screened: 125,
        screenFailed: 31,
        enrolled: 94,
        randomized: 0,
        onTreatment: 88,
        completed: 6,
        discontinued: 0,
        screenFailureRate: 24.8,
        discontinuationRate: 0,
        enrollmentRate: 8.5,
        projectedCompletionDate: '2025-06-01',
        projectedLastPatientIn: '2025-03-15',
        enrollmentVsTarget: 52.2,
        byArm: [],
        byRegion: [
          { region: 'North America', siteCount: 22, activeSites: 18, target: 180, enrolled: 94, percentComplete: 52, enrollmentRate: 8.5 },
        ],
        weeklyTrend: [],
        monthlyTrend: [],
      },
    };

    // Set sitesByStudy mapping
    const sitesByStudy: Record<string, string[]> = {
      'study-001': ['site-001', 'site-002', 'site-003', 'site-004', 'site-005', 'site-006', 'site-007', 'site-008', 'site-009', 'site-010', 'site-011'],
      'study-002': [],
      'study-003': [],
      'study-004': [],
    };

    // v182: Mock Study Designs
    const studyDesigns: Record<string, StudyDesign> = {
      'study-001': {
        id: 'design-001',
        studyId: 'study-001',
        type: 'interventional',
        phase: 'Phase 3',
        blinding: 'double-blind',
        randomization: 'stratified',
        allocationRatio: '2:1',
        hasPlacebo: true,
        hasActiveComparator: false,
        comparatorDetails: 'Standard of Care + Placebo',
        isAdaptive: false,
        adaptiveFeatures: [],
        interimAnalyses: [
          {
            id: 'ia-001',
            name: 'Interim Efficacy Analysis 1',
            triggerType: 'event-driven',
            triggerValue: 150,
            plannedDate: '2025-03-15',
            status: 'planned',
          },
          {
            id: 'ia-002',
            name: 'Final Analysis',
            triggerType: 'event-driven',
            triggerValue: 300,
            plannedDate: '2025-08-30',
            status: 'planned',
          },
        ],
        stratificationFactors: [
          { id: 'sf-001', name: 'ECOG Performance Status', levels: ['0', '1'], isRequired: true },
          { id: 'sf-002', name: 'Prior Lines of Therapy', levels: ['0-1', '2-3', '>3'], isRequired: true },
          { id: 'sf-003', name: 'Region', levels: ['North America', 'Europe', 'Asia Pacific'], isRequired: true },
        ],
        treatmentDurationWeeks: 52,
        followUpDurationWeeks: 24,
        totalDurationWeeks: 76,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: now,
      },
      'study-002': {
        id: 'design-002',
        studyId: 'study-002',
        type: 'interventional',
        phase: 'Phase 2',
        blinding: 'open-label',
        randomization: 'none',
        allocationRatio: '1:1',
        hasPlacebo: false,
        hasActiveComparator: false,
        isAdaptive: true,
        adaptiveFeatures: ['Dose finding', 'Sample size re-estimation'],
        interimAnalyses: [
          {
            id: 'ia-003',
            name: 'Dose Selection Analysis',
            triggerType: 'enrollment-driven',
            triggerValue: 60,
            plannedDate: '2025-01-15',
            status: 'planned',
          },
        ],
        stratificationFactors: [
          { id: 'sf-004', name: 'Treatment Resistance Level', levels: ['Partial', 'Complete'], isRequired: true },
        ],
        treatmentDurationWeeks: 12,
        followUpDurationWeeks: 12,
        totalDurationWeeks: 24,
        createdAt: '2024-02-15T00:00:00Z',
        updatedAt: now,
      },
      'study-003': {
        id: 'design-003',
        studyId: 'study-003',
        type: 'interventional',
        phase: 'Phase 1/2',
        blinding: 'open-label',
        randomization: 'none',
        allocationRatio: '1:1',
        hasPlacebo: false,
        hasActiveComparator: false,
        isAdaptive: true,
        adaptiveFeatures: ['3+3 dose escalation', 'Expansion cohorts'],
        interimAnalyses: [],
        stratificationFactors: [],
        treatmentDurationWeeks: 24,
        followUpDurationWeeks: 48,
        totalDurationWeeks: 72,
        createdAt: '2023-05-01T00:00:00Z',
        updatedAt: now,
      },
      'study-004': {
        id: 'design-004',
        studyId: 'study-004',
        type: 'interventional',
        phase: 'Phase 3',
        blinding: 'double-blind',
        randomization: 'stratified',
        allocationRatio: '1:1',
        hasPlacebo: true,
        hasActiveComparator: false,
        comparatorDetails: 'Placebo',
        isAdaptive: false,
        interimAnalyses: [
          {
            id: 'ia-004',
            name: 'Interim Futility Analysis',
            triggerType: 'time-driven',
            triggerValue: 18,
            plannedDate: '2026-03-01',
            status: 'planned',
          },
        ],
        stratificationFactors: [
          { id: 'sf-005', name: 'eGFR Category', levels: ['30-45', '45-60', '>60'], isRequired: true },
          { id: 'sf-006', name: 'UACR Category', levels: ['<300', '≥300'], isRequired: true },
        ],
        treatmentDurationWeeks: 104,
        followUpDurationWeeks: 26,
        totalDurationWeeks: 130,
        createdAt: '2024-06-01T00:00:00Z',
        updatedAt: now,
      },
    };

    // v182: Mock Study Arms
    const studyArms: Record<string, StudyArm[]> = {
      'study-001': [
        {
          id: 'arm-001',
          studyId: 'study-001',
          name: 'LIG-101 + Standard of Care',
          shortName: 'LIG-101 + SOC',
          type: 'experimental',
          description: 'LIG-101 450mg orally twice daily in combination with standard of care chemotherapy',
          intervention: 'LIG-101',
          dose: '450mg',
          route: 'Oral',
          frequency: 'BID',
          targetEnrollment: 300,
          enrolledSubjects: 192,
          activeSubjects: 165,
          completedSubjects: 20,
          discontinuedSubjects: 7,
          status: 'open',
          openedDate: '2024-02-01',
          allocationWeight: 2,
        },
        {
          id: 'arm-002',
          studyId: 'study-001',
          name: 'Placebo + Standard of Care',
          shortName: 'Placebo + SOC',
          type: 'placebo',
          description: 'Matching placebo orally twice daily in combination with standard of care chemotherapy',
          intervention: 'Placebo',
          dose: 'N/A',
          route: 'Oral',
          frequency: 'BID',
          targetEnrollment: 150,
          enrolledSubjects: 95,
          activeSubjects: 80,
          completedSubjects: 8,
          discontinuedSubjects: 0,
          status: 'open',
          openedDate: '2024-02-01',
          allocationWeight: 1,
        },
      ],
      'study-002': [
        {
          id: 'arm-003',
          studyId: 'study-002',
          name: 'LIG-205 Low Dose',
          shortName: 'LIG-205 25mg',
          type: 'experimental',
          description: 'LIG-205 25mg orally once daily',
          intervention: 'LIG-205',
          dose: '25mg',
          route: 'Oral',
          frequency: 'QD',
          targetEnrollment: 60,
          enrolledSubjects: 32,
          activeSubjects: 30,
          completedSubjects: 2,
          discontinuedSubjects: 0,
          status: 'open',
          openedDate: '2024-04-15',
          allocationWeight: 1,
        },
        {
          id: 'arm-004',
          studyId: 'study-002',
          name: 'LIG-205 High Dose',
          shortName: 'LIG-205 50mg',
          type: 'experimental',
          description: 'LIG-205 50mg orally once daily',
          intervention: 'LIG-205',
          dose: '50mg',
          route: 'Oral',
          frequency: 'QD',
          targetEnrollment: 60,
          enrolledSubjects: 31,
          activeSubjects: 29,
          completedSubjects: 2,
          discontinuedSubjects: 0,
          status: 'open',
          openedDate: '2024-04-15',
          allocationWeight: 1,
        },
        {
          id: 'arm-005',
          studyId: 'study-002',
          name: 'LIG-205 Very High Dose',
          shortName: 'LIG-205 75mg',
          type: 'experimental',
          description: 'LIG-205 75mg orally once daily',
          intervention: 'LIG-205',
          dose: '75mg',
          route: 'Oral',
          frequency: 'QD',
          targetEnrollment: 60,
          enrolledSubjects: 31,
          activeSubjects: 29,
          completedSubjects: 2,
          discontinuedSubjects: 0,
          status: 'open',
          openedDate: '2024-05-15',
          allocationWeight: 1,
        },
      ],
      'study-003': [
        {
          id: 'arm-006',
          studyId: 'study-003',
          name: 'LIG-301 Dose Escalation',
          shortName: 'LIG-301 DE',
          type: 'experimental',
          description: 'LIG-301 IV infusion dose escalation (3+3 design)',
          intervention: 'LIG-301',
          dose: 'Escalating',
          route: 'IV',
          frequency: 'Q3W',
          targetEnrollment: 45,
          enrolledSubjects: 45,
          activeSubjects: 8,
          completedSubjects: 35,
          discontinuedSubjects: 2,
          status: 'closed',
          openedDate: '2023-07-15',
          closedDate: '2024-06-30',
          allocationWeight: 1,
        },
        {
          id: 'arm-007',
          studyId: 'study-003',
          name: 'LIG-301 Expansion Cohort',
          shortName: 'LIG-301 Exp',
          type: 'experimental',
          description: 'LIG-301 150mg IV infusion at recommended Phase 2 dose',
          intervention: 'LIG-301',
          dose: '150mg',
          route: 'IV',
          frequency: 'Q3W',
          targetEnrollment: 45,
          enrolledSubjects: 45,
          activeSubjects: 37,
          completedSubjects: 8,
          discontinuedSubjects: 0,
          status: 'closed',
          openedDate: '2024-07-01',
          closedDate: '2024-10-30',
          allocationWeight: 1,
        },
      ],
      'study-004': [
        {
          id: 'arm-008',
          studyId: 'study-004',
          name: 'LIG-401 Treatment',
          shortName: 'LIG-401',
          type: 'experimental',
          description: 'LIG-401 10mg orally once daily',
          intervention: 'LIG-401',
          dose: '10mg',
          route: 'Oral',
          frequency: 'QD',
          targetEnrollment: 300,
          enrolledSubjects: 0,
          activeSubjects: 0,
          completedSubjects: 0,
          discontinuedSubjects: 0,
          status: 'open',
          openedDate: '2024-09-01',
          allocationWeight: 1,
        },
        {
          id: 'arm-009',
          studyId: 'study-004',
          name: 'Placebo',
          shortName: 'Placebo',
          type: 'placebo',
          description: 'Matching placebo orally once daily',
          intervention: 'Placebo',
          dose: 'N/A',
          route: 'Oral',
          frequency: 'QD',
          targetEnrollment: 300,
          enrolledSubjects: 0,
          activeSubjects: 0,
          completedSubjects: 0,
          discontinuedSubjects: 0,
          status: 'open',
          openedDate: '2024-09-01',
          allocationWeight: 1,
        },
      ],
    };

    // v182: Mock Study Endpoints
    const studyEndpoints: Record<string, StudyEndpoint[]> = {
      'study-001': [
        {
          id: 'ep-001',
          studyId: 'study-001',
          type: 'primary',
          category: 'efficacy',
          name: 'Progression-Free Survival (PFS)',
          fullDefinition: 'Time from randomization to first documented disease progression per RECIST v1.1 or death from any cause, whichever occurs first',
          assessmentMethod: 'RECIST v1.1 by independent central review',
          assessmentTimepoint: 'Every 8 weeks until progression',
          statisticalMethod: 'Stratified log-rank test',
          analysisPopulation: 'ITT',
          hypothesisType: 'superiority',
          targetValue: 'HR ≤0.70',
          minimumClinicallyImportantDifference: '3 months',
          status: 'pending',
        },
        {
          id: 'ep-002',
          studyId: 'study-001',
          type: 'secondary',
          category: 'efficacy',
          name: 'Overall Survival (OS)',
          fullDefinition: 'Time from randomization to death from any cause',
          assessmentMethod: 'Survival follow-up',
          assessmentTimepoint: 'Every 12 weeks after progression',
          statisticalMethod: 'Stratified log-rank test',
          analysisPopulation: 'ITT',
          hypothesisType: 'superiority',
          targetValue: 'HR ≤0.75',
          status: 'pending',
        },
        {
          id: 'ep-003',
          studyId: 'study-001',
          type: 'secondary',
          category: 'efficacy',
          name: 'Objective Response Rate (ORR)',
          fullDefinition: 'Proportion of subjects with confirmed complete or partial response per RECIST v1.1',
          assessmentMethod: 'RECIST v1.1 by independent central review',
          assessmentTimepoint: 'Best overall response',
          statisticalMethod: 'Cochran-Mantel-Haenszel test',
          analysisPopulation: 'ITT',
          targetValue: '≥35%',
          status: 'pending',
        },
        {
          id: 'ep-004',
          studyId: 'study-001',
          type: 'secondary',
          category: 'patient-reported',
          name: 'Quality of Life (EORTC QLQ-C30)',
          fullDefinition: 'Change from baseline in EORTC QLQ-C30 Global Health Status/QoL score',
          assessmentMethod: 'EORTC QLQ-C30 questionnaire',
          assessmentTimepoint: 'Baseline, Week 8, 16, 24, EOT',
          statisticalMethod: 'MMRM',
          analysisPopulation: 'PRO analysis set',
          minimumClinicallyImportantDifference: '10 points',
          status: 'pending',
        },
        {
          id: 'ep-005',
          studyId: 'study-001',
          type: 'safety',
          category: 'safety',
          name: 'Incidence of Treatment-Emergent Adverse Events',
          fullDefinition: 'Incidence, severity, and relationship of TEAEs according to NCI CTCAE v5.0',
          assessmentMethod: 'NCI CTCAE v5.0',
          assessmentTimepoint: 'Continuous monitoring',
          analysisPopulation: 'Safety analysis set',
          status: 'pending',
        },
      ],
      'study-002': [
        {
          id: 'ep-006',
          studyId: 'study-002',
          type: 'primary',
          category: 'efficacy',
          name: 'MADRS Change from Baseline',
          fullDefinition: 'Change from baseline in Montgomery-Åsberg Depression Rating Scale (MADRS) total score at Week 6',
          assessmentMethod: 'MADRS administered by trained raters',
          assessmentTimepoint: 'Baseline, Week 2, 4, 6',
          statisticalMethod: 'MMRM',
          analysisPopulation: 'mITT',
          hypothesisType: 'superiority',
          minimumClinicallyImportantDifference: '3 points',
          status: 'pending',
        },
        {
          id: 'ep-007',
          studyId: 'study-002',
          type: 'secondary',
          category: 'efficacy',
          name: 'Response Rate',
          fullDefinition: 'Proportion of subjects with ≥50% reduction from baseline in MADRS total score at Week 6',
          assessmentMethod: 'MADRS',
          assessmentTimepoint: 'Week 6',
          statisticalMethod: 'Logistic regression',
          analysisPopulation: 'mITT',
          targetValue: '≥40%',
          status: 'pending',
        },
        {
          id: 'ep-008',
          studyId: 'study-002',
          type: 'exploratory',
          category: 'biomarker',
          name: 'BDNF Levels',
          fullDefinition: 'Change from baseline in serum Brain-Derived Neurotrophic Factor (BDNF) levels',
          assessmentMethod: 'ELISA',
          assessmentTimepoint: 'Baseline, Week 2, 6, 12',
          analysisPopulation: 'Biomarker analysis set',
          status: 'pending',
        },
      ],
      'study-003': [
        {
          id: 'ep-009',
          studyId: 'study-003',
          type: 'primary',
          category: 'safety',
          name: 'Maximum Tolerated Dose (MTD)',
          fullDefinition: 'Highest dose level at which <33% of subjects experience DLT during the first cycle',
          assessmentMethod: 'DLT assessment per protocol',
          assessmentTimepoint: 'Cycle 1 (21 days)',
          analysisPopulation: 'DLT-evaluable',
          status: 'achieved',
          result: '150mg IV Q3W',
          resultDate: '2024-06-15',
        },
        {
          id: 'ep-010',
          studyId: 'study-003',
          type: 'secondary',
          category: 'efficacy',
          name: 'Overall Response Rate (ORR)',
          fullDefinition: 'Best overall response of PR or better per IMWG criteria',
          assessmentMethod: 'IMWG Uniform Response Criteria',
          assessmentTimepoint: 'Every cycle',
          statisticalMethod: 'Exact binomial CI',
          analysisPopulation: 'Response-evaluable',
          targetValue: '≥30%',
          status: 'achieved',
          result: '42% (38/90)',
          confidenceInterval: '32-53%',
          resultDate: '2024-11-15',
        },
        {
          id: 'ep-011',
          studyId: 'study-003',
          type: 'secondary',
          category: 'pharmacokinetic',
          name: 'Pharmacokinetic Profile',
          fullDefinition: 'Plasma PK parameters including Cmax, AUC, T1/2',
          assessmentMethod: 'LC-MS/MS',
          assessmentTimepoint: 'Cycle 1 Day 1, Cycle 2 Day 1',
          analysisPopulation: 'PK analysis set',
          status: 'achieved',
          result: 'Linear PK, T1/2 ~18 days',
          resultDate: '2024-08-01',
        },
      ],
      'study-004': [
        {
          id: 'ep-012',
          studyId: 'study-004',
          type: 'primary',
          category: 'efficacy',
          name: 'Composite Kidney Outcome',
          fullDefinition: 'Time to first occurrence of sustained ≥40% decline in eGFR, end-stage kidney disease, or renal death',
          assessmentMethod: 'Central laboratory eGFR assessment',
          assessmentTimepoint: 'Every 12 weeks',
          statisticalMethod: 'Cox proportional hazards',
          analysisPopulation: 'ITT',
          hypothesisType: 'superiority',
          targetValue: 'HR ≤0.70',
          status: 'pending',
        },
        {
          id: 'ep-013',
          studyId: 'study-004',
          type: 'secondary',
          category: 'efficacy',
          name: 'Change in UACR',
          fullDefinition: 'Percent change from baseline in urine albumin-to-creatinine ratio at Month 6',
          assessmentMethod: 'Central laboratory',
          assessmentTimepoint: 'Baseline, Month 3, 6, 12, then annually',
          statisticalMethod: 'ANCOVA',
          analysisPopulation: 'ITT',
          targetValue: '≥30% reduction',
          status: 'pending',
        },
      ],
    };

    set({
      studies,
      sites,
      sitesByStudy,
      enrollmentTracking,
      // v182: Add study design data
      studyDesigns,
      studyArms,
      studyEndpoints,
      deviationsByStudy: {
        'study-001': [],
        'study-002': [],
        'study-003': [],
        'study-004': [],
      },
    });
  },
}));

// ============================================================================
// SELECTORS / HOOKS
// ============================================================================

export const useSelectedStudy = () =>
  useCTMSStore((state) =>
    state.selectedStudyId ? state.studies[state.selectedStudyId] : null
  );

export const useSelectedSite = () =>
  useCTMSStore((state) =>
    state.selectedSiteId ? state.sites[state.selectedSiteId] : null
  );

export const useStudySites = (studyId: string) => {
  const sitesByStudy = useCTMSStore((state) => state.sitesByStudy);
  const sites = useCTMSStore((state) => state.sites);
  return useMemo(() => {
    const siteIds = sitesByStudy[studyId] || [];
    return siteIds.map((id) => sites[id]).filter(Boolean);
  }, [sitesByStudy, studyId, sites]);
};

export const useStudyArms = (studyId: string) =>
  useCTMSStore((state) => state.studyArms[studyId] || []);

export const useStudyEndpoints = (studyId: string) =>
  useCTMSStore((state) => state.studyEndpoints[studyId] || []);

export const useStudyDeviations = (studyId: string) => {
  const deviationsByStudy = useCTMSStore((state) => state.deviationsByStudy);
  const protocolDeviations = useCTMSStore((state) => state.protocolDeviations);
  return useMemo(() => {
    const ids = deviationsByStudy[studyId] || [];
    return ids.map((id) => protocolDeviations[id]).filter(Boolean);
  }, [deviationsByStudy, studyId, protocolDeviations]);
};

export const useStudyMetrics = (studyId: string) =>
  useCTMSStore((state) => state.studyMetrics[studyId]);

export const useEnrollmentTracking = (studyId: string) =>
  useCTMSStore((state) => state.enrollmentTracking[studyId]);

export const useVisitSchedule = (studyId: string) =>
  useCTMSStore((state) => state.visitSchedules[studyId]);

export const useSiteMonitoringVisits = (siteId: string) => {
  const monitoringBySite = useCTMSStore((state) => state.monitoringBySite);
  const monitoringVisits = useCTMSStore((state) => state.monitoringVisits);
  return useMemo(() => {
    const ids = monitoringBySite[siteId] || [];
    return ids.map((id) => monitoringVisits[id]).filter(Boolean);
  }, [monitoringBySite, siteId, monitoringVisits]);
};

export const useAllStudies = () => {
  const studies = useCTMSStore((state) => state.studies);
  return useMemo(() => Object.values(studies), [studies]);
};

export const useFilteredStudies = () => {
  const studies = useCTMSStore((state) => state.studies);
  const filters = useCTMSStore((state) => state.filters);
  return useMemo(() => {
    const studyList = Object.values(studies);
    return studyList.filter((study) => {
      if (filters.studyPhase?.length && !filters.studyPhase.includes(study.phase)) {
        return false;
      }
      if (filters.studyStatus?.length && !filters.studyStatus.includes(study.status)) {
        return false;
      }
      if (filters.region?.length && !study.regions.some((r) => filters.region!.includes(r))) {
        return false;
      }
      if (filters.country?.length && !study.countries.some((c) => filters.country!.includes(c))) {
        return false;
      }
      return true;
    });
  }, [studies, filters]);
};
