

// ============================================================================
// Safety Store - v74: Safety Core Implementation with Cross-Module Events
// ============================================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useMemo } from 'react'
import { useCrossModuleStore } from './useCrossModuleStore'
import type {
  ICSRCase, SafetySignal, SignalStatistics, SignalReviewCycle, SignalReviewer,
  SafetyReportingPeriod, SafetyRegulatoryLink, ExpediteReportTracker,
  SafetyState, SafetyView, SafetyFilters, CaseCreateConfig, SignalCreateConfig,
  CaseStatus, DetectionMethod, CaseWorkflowEntry, CaseComment,
  ICSRReaction, ICSRDrug, CaseSubmission,
} from './safetyTypes'

// ============================================================================
// SIGNAL THRESHOLDS
// ============================================================================

export interface SignalThresholds {
  prr: { signal: number; strong: number }
  ror: { signal: number; strong: number }
  ebgm: { signal: number; strong: number }
  minCaseCount: number
}

export const DEFAULT_SIGNAL_THRESHOLDS: SignalThresholds = {
  prr: { signal: 2.0, strong: 4.0 },
  ror: { signal: 2.0, strong: 4.0 },
  ebgm: { signal: 2.0, strong: 3.0 },
  minCaseCount: 3,
}

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

export const calculatePRR = (a: number, b: number, c: number, d: number) => {
  if (b === 0 || c === 0 || d === 0 || a === 0) return { prr: 0, lower95: 0, upper95: 0 }
  const prr = (a / (a + b)) / (c / (c + d))
  const se = Math.sqrt(1/a - 1/(a+b) + 1/c - 1/(c+d))
  return { prr: Math.round(prr * 100) / 100, lower95: Math.round(Math.exp(Math.log(prr) - 1.96 * se) * 100) / 100, upper95: Math.round(Math.exp(Math.log(prr) + 1.96 * se) * 100) / 100 }
}

export const calculateROR = (a: number, b: number, c: number, d: number) => {
  if (b === 0 || c === 0 || d === 0 || a === 0) return { ror: 0, lower95: 0, upper95: 0 }
  const ror = (a * d) / (b * c)
  const se = Math.sqrt(1/a + 1/b + 1/c + 1/d)
  return { ror: Math.round(ror * 100) / 100, lower95: Math.round(Math.exp(Math.log(ror) - 1.96 * se) * 100) / 100, upper95: Math.round(Math.exp(Math.log(ror) + 1.96 * se) * 100) / 100 }
}

export const calculateEBGM = (observed: number, expected: number, alpha = 0.5) => {
  if (expected === 0) return { ebgm: 0, lower95: 0, upper95: 0 }
  const ebgm = (observed + alpha) / (expected + alpha)
  const se = Math.sqrt((observed + alpha) / Math.pow(expected + alpha, 2))
  return { ebgm: Math.round(ebgm * 100) / 100, lower95: Math.round(Math.max(0, ebgm - 1.96 * se) * 100) / 100, upper95: Math.round((ebgm + 1.96 * se) * 100) / 100 }
}

// ============================================================================
// HELPERS
// ============================================================================

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
const generateCaseNumber = (region: string) => `${region}-LIG-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`
const generateSignalNumber = () => `SIG-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`

const createInitialFilters = (): SafetyFilters => ({
  caseStatus: 'all', casePriority: 'all', caseSeriousness: 'all',
  signalStatus: 'all', signalPriority: 'all', productId: 'all',
  dateRange: null, assignedTo: 'all', searchQuery: '',
})

// ============================================================================
// STORE TYPES
// ============================================================================

interface SafetyStoreState extends SafetyState {
  signalThresholds: SignalThresholds
}

interface SafetyStoreActions {
  createCase: (config: CaseCreateConfig) => ICSRCase
  updateCase: (id: string, updates: Partial<ICSRCase>) => void
  deleteCase: (id: string) => void
  selectCase: (id: string | null) => void
  assignCase: (caseId: string, userId: string, userName: string) => void
  submitForMedicalReview: (caseId: string) => void
  completeMedicalReview: (caseId: string, reviewerId: string, reviewerName: string, notes: string) => void
  markReadyToSubmit: (caseId: string) => void
  submitToAuthority: (caseId: string, region: string, authority: string) => CaseSubmission
  addReaction: (caseId: string, reaction: Omit<ICSRReaction, 'id'>) => ICSRReaction
  removeReaction: (caseId: string, reactionId: string) => void
  addDrug: (caseId: string, drug: Omit<ICSRDrug, 'id'>) => ICSRDrug
  removeDrug: (caseId: string, drugId: string) => void
  addComment: (caseId: string, authorId: string, authorName: string, content: string) => CaseComment
  createSignal: (config: SignalCreateConfig) => SafetySignal
  updateSignal: (id: string, updates: Partial<SafetySignal>) => void
  deleteSignal: (id: string) => void
  selectSignal: (id: string | null) => void
  runSignalDetection: (productId: string, method: DetectionMethod) => SafetySignal[]
  calculateSignalStatistics: (signalId: string) => SignalStatistics | null
  linkCasesToSignal: (signalId: string, caseIds: string[]) => void
  startSignalReviewCycle: (signalId: string) => SignalReviewCycle
  completeSignalReview: (signalId: string, cycleId: string, decision: SignalReviewCycle['decision'], rationale: string) => void
  validateSignal: (signalId: string, assessment: string) => void
  closeSignal: (signalId: string, reason: string) => void
  updateSignalThresholds: (thresholds: Partial<SignalThresholds>) => void
  createExpediteTracker: (caseId: string, reportType: ExpediteReportTracker['reportType']) => ExpediteReportTracker
  recordExpediteSubmission: (trackerId: string, region: string, referenceNumber: string) => void
  createRegulatoryLink: (sourceType: SafetyRegulatoryLink['sourceType'], sourceId: string, submissionType: SafetyRegulatoryLink['submissionType']) => SafetyRegulatoryLink
  setView: (view: SafetyView) => void
  setFilters: (filters: Partial<SafetyFilters>) => void
  clearFilters: () => void
  getCasesByProduct: (productId: string) => ICSRCase[]
  getCasesByStatus: (status: CaseStatus) => ICSRCase[]
  getSignalsByProduct: (productId: string) => SafetySignal[]
  getActiveSignals: () => SafetySignal[]
  getCasesForSignal: (signalId: string) => ICSRCase[]
  getExpeditesDue: (days: number) => ExpediteReportTracker[]
  initializeGoldenPath: () => void
  resetStore: () => void
}

type SafetyStore = SafetyStoreState & SafetyStoreActions

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: SafetyStoreState = {
  cases: {}, selectedCaseId: null,
  signals: {}, selectedSignalId: null, signalReviewCycles: {},
  reportingPeriods: {}, psurConfigurations: {},
  regulatoryLinks: {}, expediteTrackers: {},
  narrativeTemplates: {}, rmpIntegrations: {},
  view: 'case-list', filters: createInitialFilters(),
  isLoading: false, isCalculatingSignals: false, isGeneratingReport: false, error: null,
  signalThresholds: DEFAULT_SIGNAL_THRESHOLDS,
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const usePharmacovigilanceStore = create<SafetyStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      createCase: (config) => {
        const id = generateId('icsr')
        const now = new Date().toISOString()
        const newCase: ICSRCase = {
          id, caseNumber: generateCaseNumber('US'), globalCaseId: crypto.randomUUID().toUpperCase(),
          messageHeader: { messageFormatVersion: '3.0', messageFormatRelease: '3.0.1', messageType: 'ichicsr', messageId: generateId('msg'), messageDate: now, senderId: 'LIGATURE-PHARMA', senderType: 'manufacturer', receiverId: 'FDA' },
          safetyReport: { reportType: config.reportType, primarySource: config.primarySource, primarySourceCountry: 'US', reporterQualification: 'physician', firstReceiptDate: config.receiptDate || now.split('T')[0], mostRecentInfoDate: config.receiptDate || now.split('T')[0], additionalDocumentsAvailable: false, seriousness: config.seriousness, seriousnessCriteria: [], fulfilsLocalCriteria: true, localCriteriaDescription: null, reportCountry: 'US', literatureReference: null, studyId: null, studyName: null, sponsorStudyNumber: null },
          patient: { patientId: generateId('pt'), age: null, ageUnit: null, ageGroup: null, sex: 'unknown', weight: null, weightUnit: null, height: null, heightUnit: null, medicalHistory: [], deathDate: null, autopsy: null, causeOfDeath: null },
          reactions: [], testResults: [],
          drugs: [{ id: generateId('drug'), drugCharacterization: 'suspect', medicinalProductName: config.productName, activeSubstance: config.productName, mpidVersion: null, mpid: null, phpidVersion: null, phpid: null, dose: null, doseUnit: null, dosageForm: null, routeOfAdministration: null, frequency: null, cumulativeDose: null, startDate: null, endDate: null, treatmentDuration: null, treatmentDurationUnit: null, indication: null, indicationMeddra: null, actionTaken: 'unknown', reactionRecurOnRechallenge: null, reactionAbatedOnDechallenge: null, causalityAssessment: 'not-assessable', causalityMethod: null, causalityAssessor: null }],
          narrative: { caseSummary: '', reporterComments: null, senderDiagnosis: null, senderComments: null },
          status: 'draft', priority: config.seriousness.startsWith('serious') ? 'expedited-15-day' : 'routine',
          assignedTo: null, assignedToName: null, medicalReviewerId: null, medicalReviewerName: null, medicalReviewDate: null, medicalReviewNotes: null,
          workflowHistory: [{ id: generateId('wf'), caseId: id, action: 'created', fromStatus: 'draft', toStatus: 'draft', performedBy: 'system', performedByName: 'System', performedAt: now, comment: 'Case created' }],
          comments: [], submissions: [],
          receiptDate: config.receiptDate || now.split('T')[0], mostRecentInfoDate: config.receiptDate || now.split('T')[0], dataLockDate: null,
          createdAt: now, updatedAt: now,
        }
        set(state => ({ cases: { ...state.cases, [id]: newCase } }))
        
        // Emit cross-module event
        useCrossModuleStore.getState().emitEvent({
          eventType: 'entity-created',
          sourceModule: 'safety',
          targetModules: ['quality', 'regulatory'],
          entityType: 'case',
          entityId: id,
          description: `Safety case ${newCase.caseNumber} created for ${config.productName}`,
          payload: { caseNumber: newCase.caseNumber, product: config.productName, seriousness: config.seriousness },
        })
        
        return newCase
      },

      updateCase: (id, updates) => set(state => state.cases[id] ? { cases: { ...state.cases, [id]: { ...state.cases[id], ...updates, updatedAt: new Date().toISOString() } } } : state),
      deleteCase: (id) => set(state => { const { [id]: _, ...rest } = state.cases; return { cases: rest, selectedCaseId: state.selectedCaseId === id ? null : state.selectedCaseId } }),
      selectCase: (id) => set({ selectedCaseId: id }),

      assignCase: (caseId, userId, userName) => {
        const now = new Date().toISOString()
        set(state => {
          const c = state.cases[caseId]; if (!c) return state
          return { cases: { ...state.cases, [caseId]: { ...c, assignedTo: userId, assignedToName: userName, status: 'data-entry' as CaseStatus, workflowHistory: [...c.workflowHistory, { id: generateId('wf'), caseId, action: 'assigned' as const, fromStatus: c.status, toStatus: 'data-entry' as CaseStatus, performedBy: userId, performedByName: userName, performedAt: now, comment: `Assigned to ${userName}` }], updatedAt: now } } }
        })
      },

      submitForMedicalReview: (caseId) => {
        const now = new Date().toISOString()
        set(state => {
          const c = state.cases[caseId]; if (!c) return state
          return { cases: { ...state.cases, [caseId]: { ...c, status: 'medical-review' as CaseStatus, workflowHistory: [...c.workflowHistory, { id: generateId('wf'), caseId, action: 'submitted-for-medical-review' as const, fromStatus: c.status, toStatus: 'medical-review' as CaseStatus, performedBy: c.assignedTo || 'system', performedByName: c.assignedToName || 'System', performedAt: now, comment: 'Submitted for medical review' }], updatedAt: now } } }
        })
      },

      completeMedicalReview: (caseId, reviewerId, reviewerName, notes) => {
        const now = new Date().toISOString()
        set(state => {
          const c = state.cases[caseId]; if (!c) return state
          return { cases: { ...state.cases, [caseId]: { ...c, status: 'quality-review' as CaseStatus, medicalReviewerId: reviewerId, medicalReviewerName: reviewerName, medicalReviewDate: now.split('T')[0], medicalReviewNotes: notes, workflowHistory: [...c.workflowHistory, { id: generateId('wf'), caseId, action: 'medical-review-completed' as const, fromStatus: c.status, toStatus: 'quality-review' as CaseStatus, performedBy: reviewerId, performedByName: reviewerName, performedAt: now, comment: notes }], updatedAt: now } } }
        })
      },

      markReadyToSubmit: (caseId) => {
        const now = new Date().toISOString()
        set(state => {
          const c = state.cases[caseId]; if (!c) return state
          return { cases: { ...state.cases, [caseId]: { ...c, status: 'ready-to-submit' as CaseStatus, dataLockDate: now.split('T')[0], workflowHistory: [...c.workflowHistory, { id: generateId('wf'), caseId, action: 'marked-ready' as const, fromStatus: c.status, toStatus: 'ready-to-submit' as CaseStatus, performedBy: 'system', performedByName: 'System', performedAt: now, comment: 'Marked ready to submit' }], updatedAt: now } } }
        })
      },

      submitToAuthority: (caseId, region, authority) => {
        const now = new Date().toISOString()
        const caseData = get().cases[caseId]
        const sub: CaseSubmission = { id: generateId('sub'), caseId, regulatoryAuthority: authority, region, submissionType: 'initial', manufacturerCaseNumber: caseData?.caseNumber || '', authorityCaseNumber: null, status: 'submitted', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], submittedAt: now, acknowledgedAt: null, e2bMessageId: generateId('e2b'), e2bAckStatus: 'pending', e2bAckMessage: null, xmlFilePath: null, pdfFilePath: null }
        set(state => {
          const c = state.cases[caseId]; if (!c) return state
          return { cases: { ...state.cases, [caseId]: { ...c, status: 'submitted' as CaseStatus, submissions: [...c.submissions, sub], workflowHistory: [...c.workflowHistory, { id: generateId('wf'), caseId, action: 'submitted-to-authority' as const, fromStatus: c.status, toStatus: 'submitted' as CaseStatus, performedBy: 'system', performedByName: 'System', performedAt: now, comment: `Submitted to ${authority}` }], updatedAt: now } } }
        })
        
        // v0.40.8: Auto-link SAE report to TMF
        if (caseData && typeof window !== 'undefined') {
          import('@/services/tmf-auto-link-service').then(({ tmfAutoLinkService }) => {
            const caseAny = caseData as any;
            tmfAutoLinkService.onSAEReportFinalized({
              reportId: sub.id,
              studyId: caseAny.studyId || 'study-001',
              siteId: caseAny.siteId || '',
              caseNumber: caseData.caseNumber,
              seriousness: caseAny.seriousness,
            }).then(result => {
              if (result.success && result.artifact) {
                /* TMF SAE auto-linked */
              }
            }).catch(err => {
              console.warn('[TMF Auto-Link] Failed to auto-link SAE report:', err);
            });
          }).catch(() => {
            // Service not available (SSR or build time)
          });
        }
        
        return sub
      },

      addReaction: (caseId, reaction) => {
        const r = { ...reaction, id: generateId('rx') } as ICSRReaction
        set(state => { const c = state.cases[caseId]; if (!c) return state; return { cases: { ...state.cases, [caseId]: { ...c, reactions: [...c.reactions, r], updatedAt: new Date().toISOString() } } } })
        return r
      },
      removeReaction: (caseId, reactionId) => set(state => { const c = state.cases[caseId]; if (!c) return state; return { cases: { ...state.cases, [caseId]: { ...c, reactions: c.reactions.filter(r => r.id !== reactionId), updatedAt: new Date().toISOString() } } } }),

      addDrug: (caseId, drug) => {
        const d = { ...drug, id: generateId('drug') } as ICSRDrug
        set(state => { const c = state.cases[caseId]; if (!c) return state; return { cases: { ...state.cases, [caseId]: { ...c, drugs: [...c.drugs, d], updatedAt: new Date().toISOString() } } } })
        return d
      },
      removeDrug: (caseId, drugId) => set(state => { const c = state.cases[caseId]; if (!c) return state; return { cases: { ...state.cases, [caseId]: { ...c, drugs: c.drugs.filter(d => d.id !== drugId), updatedAt: new Date().toISOString() } } } }),

      addComment: (caseId, authorId, authorName, content) => {
        const cmt: CaseComment = { id: generateId('cmt'), caseId, authorId, authorName, content, replyToId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set(state => { const c = state.cases[caseId]; if (!c) return state; return { cases: { ...state.cases, [caseId]: { ...c, comments: [...c.comments, cmt], updatedAt: new Date().toISOString() } } } })
        return cmt
      },

      createSignal: (config) => {
        const id = generateId('sig')
        const now = new Date().toISOString()
        const signal: SafetySignal = {
          id, signalNumber: generateSignalNumber(), title: config.title, description: config.description,
          productId: config.productId, productName: config.productName, activeSubstance: config.activeSubstance,
          primaryEvent: config.primaryEvent, primaryEventMeddra: config.primaryEventMeddra, secondaryEvents: [], socAffected: [],
          detectionMethod: config.detectionMethod, detectionDate: now.split('T')[0], detectedBy: 'system', detectedByName: 'Signal Detection', source: config.source,
          statistics: null, linkedCaseIds: [], caseCount: 0, fatalCaseCount: 0, seriousCaseCount: 0,
          backgroundRate: null, backgroundRateSource: null, observedRate: null, expectedCases: null,
          status: 'new', priority: 'medium',
          medicalReviewerId: null, medicalReviewerName: null, medicalAssessment: null, medicalReviewDate: null,
          recommendedActions: [], actionsImplemented: [],
          regulatoryNotified: false, regulatoryNotificationDate: null, regulatoryReference: null,
          validatedDate: null, closedDate: null, closureReason: null,
          createdAt: now, updatedAt: now,
        }
        set(state => ({ signals: { ...state.signals, [id]: signal } }))
        
        // Emit cross-module event
        useCrossModuleStore.getState().emitEvent({
          eventType: 'entity-created',
          sourceModule: 'safety',
          targetModules: ['regulatory', 'labeling'],
          entityType: 'signal',
          entityId: id,
          description: `Safety signal created: ${signal.title}`,
          payload: { signalNumber: signal.signalNumber, product: config.productName, primaryEvent: config.primaryEvent },
        })
        
        return signal
      },

      updateSignal: (id, updates) => set(state => state.signals[id] ? { signals: { ...state.signals, [id]: { ...state.signals[id], ...updates, updatedAt: new Date().toISOString() } } } : state),
      deleteSignal: (id) => set(state => { const { [id]: _, ...rest } = state.signals; return { signals: rest, selectedSignalId: state.selectedSignalId === id ? null : state.selectedSignalId } }),
      selectSignal: (id) => set({ selectedSignalId: id }),

      runSignalDetection: (productId, method) => {
        set({ isCalculatingSignals: true })
        const state = get()
        const productCases = Object.values(state.cases).filter(c => c.drugs.some(d => d.medicinalProductName.toLowerCase().includes(productId.toLowerCase())))
        const reactionCounts = new Map<string, { term: string; code: string; count: number; serious: number }>()
        productCases.forEach(c => c.reactions.forEach(r => {
          const e = reactionCounts.get(r.meddraPT) || { term: r.meddraPT, code: r.meddraLLT, count: 0, serious: 0 }
          e.count++; if (r.seriousnessAtEvent) e.serious++
          reactionCounts.set(r.meddraPT, e)
        }))
        const detected: SafetySignal[] = []
        const th = state.signalThresholds
        reactionCounts.forEach((data, pt) => {
          if (data.count < th.minCaseCount) return
          const a = data.count, b = productCases.length - a, c = Math.max(1, Math.round(a * 0.3)), d = Math.max(1, 1000 - c)
          const prr = calculatePRR(a, b, c, d), ror = calculateROR(a, b, c, d), ebgm = calculateEBGM(a, c)
          if ((prr.prr >= th.prr.signal && prr.lower95 >= 1) || (ror.ror >= th.ror.signal && ror.lower95 >= 1) || (ebgm.ebgm >= th.ebgm.signal && ebgm.lower95 >= 1)) {
            const sig = get().createSignal({ title: `${pt} Signal - ${productId}`, description: `Detected for ${pt}`, productId, productName: productId, activeSubstance: productId, primaryEvent: pt, primaryEventMeddra: data.code, detectionMethod: method, source: 'spontaneous-reporting' })
            get().updateSignal(sig.id, { caseCount: data.count, seriousCaseCount: data.serious, statistics: { calculatedAt: new Date().toISOString(), prr: prr.prr, prrLower95: prr.lower95, prrUpper95: prr.upper95, ror: ror.ror, rorLower95: ror.lower95, rorUpper95: ror.upper95, ic: null, icLower95: null, icUpper95: null, ebgm: ebgm.ebgm, ebgmLower95: ebgm.lower95, ebgmUpper95: ebgm.upper95, observed: a, expected: c, chiSquare: Math.round(Math.pow(a - c, 2) / c * 100) / 100, pValue: null, meetsThreshold: true, thresholdMethod: `PRR >= ${th.prr.signal}`, thresholdValue: th.prr.signal } })
            detected.push(get().signals[sig.id])
          }
        })
        set({ isCalculatingSignals: false })
        
        // Emit cross-module event if signals were detected
        if (detected.length > 0) {
          useCrossModuleStore.getState().emitEvent({
            eventType: 'threshold-exceeded',
            sourceModule: 'safety',
            targetModules: ['regulatory'],
            entityType: 'signal',
            entityId: `detection-${Date.now()}`,
            description: `${detected.length} potential signal(s) detected for ${productId} using ${method}`,
            payload: { count: detected.length, product: productId, method },
          })
        }
        
        return detected
      },

      calculateSignalStatistics: (signalId) => {
        const sig = get().signals[signalId]; if (!sig) return null
        const cases = get().getCasesForSignal(signalId)
        const a = cases.length, b = Object.values(get().cases).length - a, c = Math.max(1, Math.round(a * 0.3)), d = Math.max(1, 1000 - c)
        const prr = calculatePRR(a, b, c, d), ror = calculateROR(a, b, c, d), ebgm = calculateEBGM(a, c)
        const stats: SignalStatistics = { calculatedAt: new Date().toISOString(), prr: prr.prr, prrLower95: prr.lower95, prrUpper95: prr.upper95, ror: ror.ror, rorLower95: ror.lower95, rorUpper95: ror.upper95, ic: null, icLower95: null, icUpper95: null, ebgm: ebgm.ebgm, ebgmLower95: ebgm.lower95, ebgmUpper95: ebgm.upper95, observed: a, expected: c, chiSquare: Math.round(Math.pow(a - c, 2) / c * 100) / 100, pValue: null, meetsThreshold: prr.lower95 >= 1 || ror.lower95 >= 1, thresholdMethod: 'Lower 95% CI >= 1', thresholdValue: 1 }
        get().updateSignal(signalId, { statistics: stats, caseCount: a })
        return stats
      },

      linkCasesToSignal: (signalId, caseIds) => set(state => {
        const sig = state.signals[signalId]; if (!sig) return state
        const linkedSet = new Set([...sig.linkedCaseIds, ...caseIds])
        const linked = Array.from(linkedSet)
        return { signals: { ...state.signals, [signalId]: { ...sig, linkedCaseIds: linked, caseCount: linked.length, updatedAt: new Date().toISOString() } } }
      }),

      startSignalReviewCycle: (signalId) => {
        const sig = get().signals[signalId], existing = get().signalReviewCycles[signalId] || []
        const cycle: SignalReviewCycle = { id: generateId('src'), signalId, cycleNumber: existing.length + 1, status: 'open', reviewers: [], leadReviewerId: sig?.medicalReviewerId || '', meetingScheduled: null, meetingHeld: null, meetingMinutes: null, decision: null, decisionRationale: null, decisionDate: null, nextReviewDate: null, createdAt: new Date().toISOString(), completedAt: null }
        set(state => ({ signalReviewCycles: { ...state.signalReviewCycles, [signalId]: [...existing, cycle] } }))
        get().updateSignal(signalId, { status: 'under-evaluation' })
        return cycle
      },

      completeSignalReview: (signalId, cycleId, decision, rationale) => {
        const now = new Date().toISOString()
        set(state => ({ signalReviewCycles: { ...state.signalReviewCycles, [signalId]: (state.signalReviewCycles[signalId] || []).map(c => c.id === cycleId ? { ...c, status: 'completed' as const, decision, decisionRationale: rationale, decisionDate: now.split('T')[0], completedAt: now } : c) } }))
        if (decision === 'validate') get().validateSignal(signalId, rationale)
        else if (decision === 'refute' || decision === 'close') get().closeSignal(signalId, rationale)
      },

      validateSignal: (signalId, assessment) => {
        const signal = get().signals[signalId]
        get().updateSignal(signalId, { status: 'validated', medicalAssessment: assessment, medicalReviewDate: new Date().toISOString().split('T')[0], validatedDate: new Date().toISOString().split('T')[0] })
        // Emit cross-module event
        if (signal) {
          useCrossModuleStore.getState().emitEvent({
            eventType: 'entity-status-changed',
            sourceModule: 'safety',
            targetModules: ['labeling', 'regulatory', 'submissions'],
            entityType: 'signal',
            entityId: signalId,
            description: `Signal validated: ${signal.title}`,
            payload: { signalNumber: signal.signalNumber, status: 'validated' },
          })
        }
      },
      closeSignal: (signalId, reason) => {
        const signal = get().signals[signalId]
        get().updateSignal(signalId, { status: 'closed-no-action', closedDate: new Date().toISOString().split('T')[0], closureReason: reason })
        // Emit cross-module event
        if (signal) {
          useCrossModuleStore.getState().emitEvent({
            eventType: 'workflow-completed',
            sourceModule: 'safety',
            targetModules: [],
            entityType: 'signal',
            entityId: signalId,
            description: `Signal closed: ${signal.title}`,
            payload: { signalNumber: signal.signalNumber, reason },
          })
        }
      },
      updateSignalThresholds: (thresholds) => set(state => ({ signalThresholds: { ...state.signalThresholds, ...thresholds } })),

      createExpediteTracker: (caseId, reportType) => {
        const c = get().cases[caseId], id = generateId('exp'), now = new Date(), days = reportType.includes('7-day') ? 7 : 15
        const tracker: ExpediteReportTracker = { id, caseId, caseNumber: c?.caseNumber || '', reportType, regions: [{ region: 'US', authority: 'FDA', required: true, daysAllowed: days as 7 | 15, submissionMethod: 'gateway', status: 'pending', submittedAt: null, acknowledgedAt: null }], overallStatus: 'pending', awareDate: now.toISOString().split('T')[0], clockStartDate: now.toISOString().split('T')[0], dueDate: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0], submissionLog: [], createdAt: now.toISOString(), updatedAt: now.toISOString() }
        set(state => ({ expediteTrackers: { ...state.expediteTrackers, [id]: tracker } }))
        return tracker
      },

      recordExpediteSubmission: (trackerId, region, referenceNumber) => {
        const now = new Date().toISOString()
        set(state => {
          const t = state.expediteTrackers[trackerId]; if (!t) return state
          return { expediteTrackers: { ...state.expediteTrackers, [trackerId]: { ...t, regions: t.regions.map(r => r.region === region ? { ...r, status: 'submitted' as const, submittedAt: now } : r), submissionLog: [...t.submissionLog, { id: generateId('log'), region, submittedAt: now, submittedBy: 'system', method: 'gateway', referenceNumber, status: 'submitted', responseDate: null, responseNotes: null }], overallStatus: 'in-progress', updatedAt: now } } }
        })
      },

      createRegulatoryLink: (sourceType, sourceId, submissionType) => {
        const id = generateId('reglink'), now = new Date().toISOString()
        const link: SafetyRegulatoryLink = { id, sourceType, sourceId, submissionType, sequenceBuildId: null, ctdSection: '', documentTitle: '', documentType: 'narrative', documentPath: null, status: 'pending', linkedAt: now, linkedBy: 'system', generatedAt: null, submittedAt: null }
        set(state => ({ regulatoryLinks: { ...state.regulatoryLinks, [id]: link } }))
        return link
      },

      setView: (view) => set({ view }),
      setFilters: (filters) => set(state => ({ filters: { ...state.filters, ...filters } })),
      clearFilters: () => set({ filters: createInitialFilters() }),

      getCasesByProduct: (productId) => Object.values(get().cases).filter(c => c.drugs.some(d => d.medicinalProductName.toLowerCase().includes(productId.toLowerCase()))),
      getCasesByStatus: (status) => Object.values(get().cases).filter(c => c.status === status),
      getSignalsByProduct: (productId) => Object.values(get().signals).filter(s => s.productId === productId || s.productName.toLowerCase().includes(productId.toLowerCase())),
      getActiveSignals: () => Object.values(get().signals).filter(s => s.status === 'new' || s.status === 'under-evaluation' || s.status === 'validated'),
      getCasesForSignal: (signalId) => { const sig = get().signals[signalId]; return sig ? sig.linkedCaseIds.map(id => get().cases[id]).filter(Boolean) : [] },
      getExpeditesDue: (days) => { const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; return Object.values(get().expediteTrackers).filter(t => t.overallStatus === 'pending' && t.dueDate <= cutoff) },

      initializeGoldenPath: () => set({ isLoading: false }),
      resetStore: () => set(initialState),
    }),
    { name: 'safety-store' }
  )
)

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

export const useCases = () => usePharmacovigilanceStore(state => state.cases)
export const useCasesList = () => {
  const cases = usePharmacovigilanceStore(state => state.cases)
  return useMemo(() => Object.values(cases), [cases])
}
export const useSelectedCase = () => usePharmacovigilanceStore(state => state.selectedCaseId ? state.cases[state.selectedCaseId] : null)
export const useSignals = () => usePharmacovigilanceStore(state => state.signals)
export const useSignalsList = () => {
  const signals = usePharmacovigilanceStore(state => state.signals)
  return useMemo(() => Object.values(signals), [signals])
}
export const useSelectedSignal = () => usePharmacovigilanceStore(state => state.selectedSignalId ? state.signals[state.selectedSignalId] : null)
const EMPTY_REVIEW_CYCLES: never[] = []
export const useSignalReviewCycles = (signalId: string) => usePharmacovigilanceStore(state => state.signalReviewCycles[signalId] || EMPTY_REVIEW_CYCLES)
export const useExpediteTrackers = () => usePharmacovigilanceStore(state => state.expediteTrackers)
export const useRegulatoryLinks = () => usePharmacovigilanceStore(state => state.regulatoryLinks)
export const useSafetyView = () => usePharmacovigilanceStore(state => state.view)
export const useSafetyFilters = () => usePharmacovigilanceStore(state => state.filters)
export const useSafetyLoading = () => usePharmacovigilanceStore(state => state.isLoading)
export const useSignalThresholds = () => usePharmacovigilanceStore(state => state.signalThresholds)
