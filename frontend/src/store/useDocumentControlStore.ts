

// Document Control Store - Enterprise Document Management (v58)
import { useMemo } from 'react';
import { create } from 'zustand';
import type {
  DocumentControlState, DocumentControlActions, EnterpriseDocument, DocumentVersion, DocumentVersionRef,
  DocumentCollaborator, DocumentTemplate, ContentComponent, DocumentAssembly, AssemblyValidation,
  ReviewCycle, ReviewerAssignment, Annotation, AnnotationReply, DocumentWorkflow, WorkflowInstance,
  WorkflowStepExecution, ElectronicSignature, ArchivePolicy, LegalHold, ArchiveRecord, ContentDiff,
  DocumentSearchQuery, DocumentSearchResult, ContentReuseAnalysis, DocumentAnalytics, SearchResultDocument,
  ModuleDocumentMapping, DocumentControlFilters, DocumentControlView, CollaborationRole, DocumentPermission,
  WorkflowAction, SimilarDocument, ReuseOpportunity, ComponentCandidate, TrendDataPoint
} from './documentControlTypes';

const generateId = () => `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateDocId = (counter: number) => `DOC-${new Date().getFullYear()}-${String(counter).padStart(5, '0')}`;
const now = () => new Date().toISOString();

const initialFilters: DocumentControlFilters = {
  categories: [], classifications: [], statuses: [], formats: [],
  owners: [], authors: [], departments: [], tags: []
};

const initialState: DocumentControlState = {
  documents: {}, documentsByDocId: {}, versions: {}, versionsByDocument: {},
  templates: {}, components: {}, assemblies: {},
  reviewCycles: {}, reviewCyclesByDocument: {}, annotations: {}, sessions: {},
  workflows: {}, workflowInstances: {}, instancesByDocument: {}, signatures: {},
  archivePolicies: {}, legalHolds: {}, archiveRecords: {}, archiveByDocument: {},
  savedSearches: {}, recentSearches: [], searchResults: undefined,
  analytics: null, contentReuseAnalyses: {},
  moduleMappings: {}, mappingsByDocument: {}, syncEvents: {},
  selectedDocumentId: null, selectedTemplateId: null, selectedReviewCycleId: null, selectedWorkflowId: null,
  activeView: 'documents', filters: initialFilters, isLoading: false, error: null
};

export const useDocumentControlStore = create<DocumentControlState & DocumentControlActions>((set, get) => ({
  ...initialState,

  createDocument: (data) => {
    const id = generateId();
    const docId = generateDocId(Object.keys(get().documents).length + 1);
    const doc: EnterpriseDocument = {
      id, documentId: data.documentId || docId, title: data.title || 'Untitled Document',
      description: data.description || '', category: data.category || 'regulatory',
      classification: data.classification || 'controlled', contentType: data.contentType || 'document',
      version: '1.0.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, versionHistory: [],
      status: 'draft', ownerId: data.ownerId || 'system', ownerName: data.ownerName || 'System',
      ownerDepartment: data.ownerDepartment || 'regulatory-affairs', authorId: data.authorId || 'system',
      authorName: data.authorName || 'System', collaborators: data.collaborators || [],
      fileFormat: data.fileFormat || 'docx', filePath: data.filePath || `/docs/${docId}.docx`,
      fileSize: data.fileSize || 0, fileChecksum: data.fileChecksum || '', contentHash: data.contentHash || '',
      folders: data.folders || [], tags: data.tags || [], keywords: data.keywords || [], language: data.language || 'en',
      relatedDocumentIds: data.relatedDocumentIds || [], linkedModules: data.linkedModules || [],
      attachments: data.attachments || [], customMetadata: data.customMetadata || {},
      securityClassification: data.securityClassification || 'internal', accessControlList: data.accessControlList || [],
      archiveStatus: 'active', retentionCategory: data.retentionCategory || 'regulatory-submission',
      retentionPeriodYears: data.retentionPeriodYears || 15, legalHoldIds: [], childDocumentIds: [],
      createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system',
      ...data
    };
    set((state) => ({
      documents: { ...state.documents, [id]: doc },
      documentsByDocId: { ...state.documentsByDocId, [doc.documentId]: id }
    }));
    return doc;
  },

  updateDocument: (id, updates) => {
    const doc = get().documents[id];
    if (doc) set((state) => ({ documents: { ...state.documents, [id]: { ...doc, ...updates, updatedAt: now() } } }));
  },

  deleteDocument: (id) => {
    const doc = get().documents[id];
    if (!doc) return;
    set((state) => {
      const { [id]: _, ...docs } = state.documents;
      const { [doc.documentId]: __, ...byDocId } = state.documentsByDocId;
      return { documents: docs, documentsByDocId: byDocId };
    });
  },

  duplicateDocument: (id, newTitle) => {
    const original = get().documents[id];
    if (!original) return null as unknown as EnterpriseDocument;
    return get().createDocument({ ...original, id: undefined, documentId: undefined, title: newTitle, status: 'draft', version: '1.0.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, versionHistory: [], parentDocumentId: id });
  },

  // v0.13.42: Create document from upload result
  createDocumentFromUpload: (documentData, versionInfo) => {
    const id = generateId();
    const docId = generateDocId(Object.keys(get().documents).length + 1);
    
    // If creating as new version, link to parent
    const parentDoc = versionInfo?.previousDocumentId ? get().documents[versionInfo.previousDocumentId] : null;
    
    const doc: EnterpriseDocument = {
      id,
      documentId: docId,
      title: documentData.title || 'Uploaded Document',
      description: documentData.description || '',
      category: documentData.category || 'regulatory',
      classification: documentData.classification || 'controlled',
      contentType: documentData.contentType || 'document',
      version: '1.0.0',
      majorVersion: 1,
      minorVersion: 0,
      patchVersion: 0,
      versionHistory: [],
      status: 'draft',
      ownerId: documentData.ownerId || 'system',
      ownerName: documentData.ownerName || 'System',
      ownerDepartment: documentData.ownerDepartment || 'regulatory-affairs',
      authorId: documentData.authorId || 'system',
      authorName: documentData.authorName || 'System',
      collaborators: [],
      fileFormat: documentData.fileFormat || 'pdf',
      filePath: documentData.filePath || '',
      fileSize: documentData.fileSize || 0,
      fileChecksum: documentData.fileChecksum || '',
      contentHash: documentData.contentHash || '',
      folders: documentData.folders || [],
      tags: documentData.tags || [],
      keywords: documentData.keywords || [],
      language: documentData.language || 'en',
      relatedDocumentIds: parentDoc ? [parentDoc.id] : [],
      linkedModules: [],
      attachments: [],
      customMetadata: {
        ...documentData.customMetadata,
        createdFromUpload: true,
        ...(versionInfo?.isNewVersion && { isVersionOf: versionInfo.previousDocumentId }),
      },
      securityClassification: documentData.securityClassification || 'internal',
      accessControlList: [],
      archiveStatus: 'active',
      retentionCategory: documentData.retentionCategory || 'regulatory-submission',
      retentionPeriodYears: documentData.retentionPeriodYears || 15,
      legalHoldIds: [],
      childDocumentIds: [],
      parentDocumentId: versionInfo?.isNewVersion ? versionInfo.previousDocumentId : undefined,
      createdAt: now(),
      createdBy: documentData.createdBy || 'system',
      updatedAt: now(),
      lastModifiedBy: documentData.createdBy || 'system',
    };
    
    // If this is a new version, update the parent document
    if (versionInfo?.isNewVersion && versionInfo.previousDocumentId && parentDoc) {
      set((state) => ({
        documents: {
          ...state.documents,
          [id]: doc,
          [versionInfo.previousDocumentId!]: {
            ...parentDoc,
            childDocumentIds: [...parentDoc.childDocumentIds, id],
            updatedAt: now(),
          },
        },
        documentsByDocId: { ...state.documentsByDocId, [doc.documentId]: id },
      }));
    } else {
      set((state) => ({
        documents: { ...state.documents, [id]: doc },
        documentsByDocId: { ...state.documentsByDocId, [doc.documentId]: id },
      }));
    }
    
    return doc;
  },

  createVersion: (documentId, changeDescription, changeType) => {
    const doc = get().documents[documentId];
    if (!doc) return null as unknown as DocumentVersion;
    const id = generateId();
    let newMajor = doc.majorVersion, newMinor = doc.minorVersion, newPatch = doc.patchVersion;
    if (changeType === 'major') { newMajor++; newMinor = 0; newPatch = 0; }
    else if (changeType === 'minor') { newMinor++; newPatch = 0; }
    else { newPatch++; }
    const version = `${newMajor}.${newMinor}.${newPatch}`;
    const docVersion: DocumentVersion = {
      id, documentId, version, majorVersion: newMajor, minorVersion: newMinor, patchVersion: newPatch,
      content: { id: generateId(), versionId: id, sections: [], toc: [], headers: [], footers: [], citations: [], crossReferences: [], glossaryTerms: [], abbreviations: [], tables: [], figures: [], equations: [] },
      contentHash: '', filePath: doc.filePath, fileSize: doc.fileSize, changeDescription, changeType,
      changedSections: [], status: 'draft', approvalRecords: [], createdAt: now(), createdBy: doc.lastModifiedBy, isBaseline: false
    };
    const versionRef: DocumentVersionRef = { versionId: id, version, majorVersion: newMajor, minorVersion: newMinor, patchVersion: newPatch, createdAt: now(), createdBy: doc.lastModifiedBy, changeDescription, status: 'draft' };
    set((state) => ({
      versions: { ...state.versions, [id]: docVersion },
      versionsByDocument: { ...state.versionsByDocument, [documentId]: [...(state.versionsByDocument[documentId] || []), id] },
      documents: { ...state.documents, [documentId]: { ...doc, version, majorVersion: newMajor, minorVersion: newMinor, patchVersion: newPatch, versionHistory: [...doc.versionHistory, versionRef], updatedAt: now() } }
    }));
    return docVersion;
  },

  lockVersion: (versionId, lockedBy) => { const v = get().versions[versionId]; if (v) set((state) => ({ versions: { ...state.versions, [versionId]: { ...v, lockedAt: now(), lockedBy } } })); },
  unlockVersion: (versionId) => { const v = get().versions[versionId]; if (v) set((state) => ({ versions: { ...state.versions, [versionId]: { ...v, lockedAt: undefined, lockedBy: undefined } } })); },

  compareVersions: (fromVersionId, toVersionId) => {
    const fromV = get().versions[fromVersionId]; const toV = get().versions[toVersionId];
    if (!fromV || !toV) return null as unknown as ContentDiff;
    return { id: generateId(), fromVersionId, toVersionId, generatedAt: now(), addedSections: 3, removedSections: 1, modifiedSections: 5, addedWords: 450, removedWords: 120, changes: [{ id: generateId(), changeType: 'modified', sectionId: 'sec-1', sectionTitle: 'Introduction', previousContent: 'Old', newContent: 'New', changeDescription: 'Updated' }] };
  },

  createBaseline: (versionId, label) => { const v = get().versions[versionId]; if (v) set((state) => ({ versions: { ...state.versions, [versionId]: { ...v, isBaseline: true, baselineLabel: label } } })); },

  submitForReview: (documentId) => { const doc = get().documents[documentId]; if (doc) set((state) => ({ documents: { ...state.documents, [documentId]: { ...doc, status: 'in-review', updatedAt: now() } } })); },
  submitForApproval: (documentId) => { const doc = get().documents[documentId]; if (doc) set((state) => ({ documents: { ...state.documents, [documentId]: { ...doc, status: 'pending-approval', updatedAt: now() } } })); },

  approveDocument: (versionId, approverId, comments) => {
    const v = get().versions[versionId]; if (!v) return;
    const approval = { id: generateId(), versionId, approverRole: 'approver', approverId, approverName: approverId, decision: 'approved' as const, comments, decisionDate: now(), dueDate: now() };
    set((state) => ({ versions: { ...state.versions, [versionId]: { ...v, status: 'approved', approvalRecords: [...v.approvalRecords, approval] } }, documents: { ...state.documents, [v.documentId]: { ...state.documents[v.documentId], status: 'approved', updatedAt: now() } } }));
  },

  rejectDocument: (versionId, approverId, reason) => {
    const v = get().versions[versionId]; if (!v) return;
    set((state) => ({ versions: { ...state.versions, [versionId]: { ...v, status: 'rejected', approvalRecords: [...v.approvalRecords, { id: generateId(), versionId, approverRole: 'approver', approverId, approverName: approverId, decision: 'rejected' as const, comments: reason, decisionDate: now(), dueDate: now() }] } }, documents: { ...state.documents, [v.documentId]: { ...state.documents[v.documentId], status: 'rejected', updatedAt: now() } } }));
  },

  makeEffective: (versionId, effectiveDate) => {
    const v = get().versions[versionId]; if (!v) return;
    set((state) => ({ versions: { ...state.versions, [versionId]: { ...v, status: 'effective', effectiveDate } }, documents: { ...state.documents, [v.documentId]: { ...state.documents[v.documentId], status: 'effective', effectiveDate, updatedAt: now() } } }));
  },

  retireDocument: (documentId, reason) => { const doc = get().documents[documentId]; if (doc) set((state) => ({ documents: { ...state.documents, [documentId]: { ...doc, status: 'retired', retiredDate: now(), updatedAt: now() } } })); },

  supersede: (oldDocumentId, newDocumentId) => {
    const oldDoc = get().documents[oldDocumentId]; const newDoc = get().documents[newDocumentId];
    if (oldDoc && newDoc) set((state) => ({ documents: { ...state.documents, [oldDocumentId]: { ...oldDoc, status: 'superseded', updatedAt: now() }, [newDocumentId]: { ...newDoc, parentDocumentId: oldDocumentId, updatedAt: now() } } }));
  },

  createTemplate: (data) => {
    const id = generateId();
    const template: DocumentTemplate = { id, templateId: data.templateId || `TPL-${Date.now()}`, name: data.name || 'Untitled Template', description: data.description || '', category: data.category || 'regulatory', documentType: data.documentType || 'General', structure: data.structure || [], requiredComponents: data.requiredComponents || [], optionalComponents: data.optionalComponents || [], defaultFormat: data.defaultFormat || 'docx', defaultClassification: data.defaultClassification || 'controlled', defaultSecurityLevel: data.defaultSecurityLevel || 'internal', variables: data.variables || [], conditionalSections: data.conditionalSections || [], version: '1.0', isActive: true, applicableRegions: data.applicableRegions || ['US', 'EU'], usageCount: 0, createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system' };
    set((state) => ({ templates: { ...state.templates, [id]: template } }));
    return template;
  },

  updateTemplate: (id, updates) => { const t = get().templates[id]; if (t) set((state) => ({ templates: { ...state.templates, [id]: { ...t, ...updates, updatedAt: now() } } })); },
  deleteTemplate: (id) => { set((state) => { const { [id]: _, ...rest } = state.templates; return { templates: rest }; }); },

  createDocumentFromTemplate: (templateId, variables) => {
    const template = get().templates[templateId]; if (!template) return null as unknown as EnterpriseDocument;
    const doc = get().createDocument({ title: variables['title'] || `${template.name} - ${new Date().toLocaleDateString()}`, category: template.category, classification: template.defaultClassification, fileFormat: template.defaultFormat, securityClassification: template.defaultSecurityLevel, customMetadata: { templateId, ...variables } });
    set((state) => ({ templates: { ...state.templates, [templateId]: { ...template, usageCount: template.usageCount + 1, lastUsedAt: now() } } }));
    return doc;
  },

  createComponent: (data) => {
    const id = generateId();
    const component: ContentComponent = { id, componentId: data.componentId || `CMP-${Date.now()}`, name: data.name || 'Untitled Component', description: data.description || '', category: data.category || 'regulatory', componentType: data.componentType || 'boilerplate', content: data.content || '', contentFormat: data.contentFormat || 'text', variables: data.variables || [], applicableDocTypes: data.applicableDocTypes || [], applicableRegions: data.applicableRegions || [], version: '1.0', effectiveDate: now(), status: 'draft', usageCount: 0, usedInDocuments: [], createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), lastModifiedBy: data.createdBy || 'system' };
    set((state) => ({ components: { ...state.components, [id]: component } }));
    return component;
  },

  updateComponent: (id, updates) => { const c = get().components[id]; if (c) set((state) => ({ components: { ...state.components, [id]: { ...c, ...updates, updatedAt: now() } } })); },
  deleteComponent: (id) => { set((state) => { const { [id]: _, ...rest } = state.components; return { components: rest }; }); },
  insertComponent: (documentId, sectionId, componentId, variables) => { const component = get().components[componentId]; if (component) set((state) => ({ components: { ...state.components, [componentId]: { ...component, usageCount: component.usageCount + 1, usedInDocuments: [...component.usedInDocuments, documentId] } } })); },

  createAssembly: (data) => {
    const id = generateId();
    const assembly: DocumentAssembly = { id, assemblyId: data.assemblyId || `ASM-${Date.now()}`, name: data.name || 'Untitled Assembly', description: data.description || '', templateId: data.templateId || '', status: 'draft', variableValues: data.variableValues || {}, selectedComponents: data.selectedComponents || [], sectionOverrides: data.sectionOverrides || [], outputFormat: data.outputFormat || 'docx', outputFileName: data.outputFileName || 'assembled-document.docx', assemblySteps: [], validationResults: [], createdAt: now(), createdBy: data.createdBy || 'system' };
    set((state) => ({ assemblies: { ...state.assemblies, [id]: assembly } }));
    return assembly;
  },

  updateAssembly: (id, updates) => { const a = get().assemblies[id]; if (a) set((state) => ({ assemblies: { ...state.assemblies, [id]: { ...a, ...updates } } })); },

  executeAssembly: (assemblyId) => {
    const assembly = get().assemblies[assemblyId]; if (!assembly || !assembly.templateId) return null;
    const doc = get().createDocumentFromTemplate(assembly.templateId, assembly.variableValues);
    if (doc) set((state) => ({ assemblies: { ...state.assemblies, [assemblyId]: { ...assembly, status: 'assembled', outputDocumentId: doc.id, assembledAt: now(), assembledBy: 'system' } } }));
    return doc;
  },

  validateAssembly: (assemblyId) => {
    const assembly = get().assemblies[assemblyId]; if (!assembly) return [];
    const validations: AssemblyValidation[] = [{ id: generateId(), validationType: 'structure', status: 'passed', message: 'Document structure is valid' }, { id: generateId(), validationType: 'content', status: 'passed', message: 'All required content present' }];
    set((state) => ({ assemblies: { ...state.assemblies, [assemblyId]: { ...assembly, validationResults: validations } } }));
    return validations;
  },

  addCollaborator: (documentId, userId, role, permissions) => {
    const doc = get().documents[documentId]; if (!doc) return null as unknown as DocumentCollaborator;
    const collaborator: DocumentCollaborator = { id: generateId(), userId, userName: userId, email: `${userId}@example.com`, role, permissions, addedAt: now(), addedBy: 'system', isActive: true };
    set((state) => ({ documents: { ...state.documents, [documentId]: { ...doc, collaborators: [...doc.collaborators, collaborator], updatedAt: now() } } }));
    return collaborator;
  },

  removeCollaborator: (documentId, collaboratorId) => { const doc = get().documents[documentId]; if (doc) set((state) => ({ documents: { ...state.documents, [documentId]: { ...doc, collaborators: doc.collaborators.filter(c => c.id !== collaboratorId), updatedAt: now() } } })); },
  updateCollaboratorPermissions: (documentId, collaboratorId, permissions) => { const doc = get().documents[documentId]; if (doc) set((state) => ({ documents: { ...state.documents, [documentId]: { ...doc, collaborators: doc.collaborators.map(c => c.id === collaboratorId ? { ...c, permissions } : c), updatedAt: now() } } })); },

  createReviewCycle: (data) => {
    const id = generateId();
    const cycle: ReviewCycle = { id, reviewCycleId: data.reviewCycleId || `REV-${Date.now()}`, documentId: data.documentId || '', documentVersionId: data.documentVersionId || '', reviewType: data.reviewType || 'internal', reviewPurpose: data.reviewPurpose || '', startDate: data.startDate || now(), dueDate: data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'not-started', currentRound: 1, maxRounds: data.maxRounds || 3, reviewCoordinator: data.reviewCoordinator || 'system', reviewCoordinatorId: data.reviewCoordinatorId || 'system', reviewers: data.reviewers || [], annotations: [], reviewComments: [], unresolvedCount: 0, createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now() };
    set((state) => ({ reviewCycles: { ...state.reviewCycles, [id]: cycle }, reviewCyclesByDocument: { ...state.reviewCyclesByDocument, [cycle.documentId]: [...(state.reviewCyclesByDocument[cycle.documentId] || []), id] } }));
    return cycle;
  },

  assignReviewer: (reviewCycleId, reviewer) => {
    const cycle = get().reviewCycles[reviewCycleId]; if (!cycle) return null as unknown as ReviewerAssignment;
    const assignment: ReviewerAssignment = { id: generateId(), reviewCycleId, reviewerId: reviewer.reviewerId || 'user', reviewerName: reviewer.reviewerName || 'Reviewer', reviewerEmail: reviewer.reviewerEmail || '', role: reviewer.role || 'primary', assignedSections: reviewer.assignedSections || [], assignedAt: now(), dueDate: reviewer.dueDate || cycle.dueDate, status: 'assigned', annotationCount: 0 };
    set((state) => ({ reviewCycles: { ...state.reviewCycles, [reviewCycleId]: { ...cycle, reviewers: [...cycle.reviewers, assignment], updatedAt: now() } } }));
    return assignment;
  },

  removeReviewer: (reviewCycleId, assignmentId) => { const cycle = get().reviewCycles[reviewCycleId]; if (cycle) set((state) => ({ reviewCycles: { ...state.reviewCycles, [reviewCycleId]: { ...cycle, reviewers: cycle.reviewers.filter(r => r.id !== assignmentId), updatedAt: now() } } })); },

  startReviewCycle: (reviewCycleId) => {
    const cycle = get().reviewCycles[reviewCycleId];
    if (cycle) { set((state) => ({ reviewCycles: { ...state.reviewCycles, [reviewCycleId]: { ...cycle, status: 'in-progress', startDate: now(), updatedAt: now() } } })); get().submitForReview(cycle.documentId); }
  },

  completeReviewerAssignment: (assignmentId, recommendation, comments) => {
    Object.values(get().reviewCycles).forEach(cycle => {
      if (cycle.reviewers.find(r => r.id === assignmentId)) {
        set((state) => ({ reviewCycles: { ...state.reviewCycles, [cycle.id]: { ...cycle, reviewers: cycle.reviewers.map(r => r.id === assignmentId ? { ...r, status: 'completed', completedAt: now(), recommendation, overallComments: comments } : r), updatedAt: now() } } }));
      }
    });
  },

  completeReviewCycle: (reviewCycleId, summary) => { const cycle = get().reviewCycles[reviewCycleId]; if (cycle) set((state) => ({ reviewCycles: { ...state.reviewCycles, [reviewCycleId]: { ...cycle, status: 'completed', completedDate: now(), resolutionSummary: summary, updatedAt: now() } } })); },

  addAnnotation: (data) => {
    const id = generateId();
    const annotation: Annotation = { id, reviewCycleId: data.reviewCycleId || '', documentVersionId: data.documentVersionId || '', sectionId: data.sectionId, pageNumber: data.pageNumber, startPosition: data.startPosition, endPosition: data.endPosition, selectedText: data.selectedText, annotationType: data.annotationType || 'comment', content: data.content || '', suggestedText: data.suggestedText, priority: data.priority || 'medium', category: data.category, authorId: data.authorId || 'system', authorName: data.authorName || 'System', createdAt: now(), status: 'open', replies: [] };
    set((state) => ({ annotations: { ...state.annotations, [id]: annotation } }));
    if (data.reviewCycleId) { const cycle = get().reviewCycles[data.reviewCycleId]; if (cycle) set((state) => ({ reviewCycles: { ...state.reviewCycles, [data.reviewCycleId!]: { ...cycle, annotations: [...cycle.annotations, annotation], unresolvedCount: cycle.unresolvedCount + 1, updatedAt: now() } } })); }
    return annotation;
  },

  updateAnnotation: (id, updates) => { const a = get().annotations[id]; if (a) set((state) => ({ annotations: { ...state.annotations, [id]: { ...a, ...updates } } })); },

  resolveAnnotation: (id, resolution, notes) => {
    const a = get().annotations[id]; if (!a) return;
    set((state) => ({ annotations: { ...state.annotations, [id]: { ...a, status: resolution, resolvedAt: now(), resolvedBy: 'system', resolutionNotes: notes } } }));
    if (a.reviewCycleId && resolution !== 'open') { const cycle = get().reviewCycles[a.reviewCycleId]; if (cycle) set((state) => ({ reviewCycles: { ...state.reviewCycles, [a.reviewCycleId]: { ...cycle, unresolvedCount: Math.max(0, cycle.unresolvedCount - 1), updatedAt: now() } } })); }
  },

  replyToAnnotation: (annotationId, content) => {
    const a = get().annotations[annotationId]; if (!a) return null as unknown as AnnotationReply;
    const reply: AnnotationReply = { id: generateId(), annotationId, authorId: 'system', authorName: 'System', content, createdAt: now() };
    set((state) => ({ annotations: { ...state.annotations, [annotationId]: { ...a, replies: [...a.replies, reply] } } }));
    return reply;
  },

  createWorkflow: (data) => {
    const id = generateId();
    const workflow: DocumentWorkflow = { id, workflowId: data.workflowId || `WF-${Date.now()}`, name: data.name || 'Untitled Workflow', description: data.description || '', documentCategories: data.documentCategories || [], documentTypes: data.documentTypes || [], classifications: data.classifications || [], steps: data.steps || [], transitions: data.transitions || [], isActive: true, requiresElectronicSignature: data.requiresElectronicSignature ?? true, allowParallelApprovals: data.allowParallelApprovals ?? false, escalationEnabled: data.escalationEnabled ?? true, escalationDays: data.escalationDays || 3, createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now(), version: '1.0' };
    set((state) => ({ workflows: { ...state.workflows, [id]: workflow } }));
    return workflow;
  },

  updateWorkflow: (id, updates) => { const w = get().workflows[id]; if (w) set((state) => ({ workflows: { ...state.workflows, [id]: { ...w, ...updates, updatedAt: now() } } })); },

  startWorkflow: (documentVersionId, workflowId) => {
    const workflow = get().workflows[workflowId]; const version = get().versions[documentVersionId];
    if (!workflow || !version) return null as unknown as WorkflowInstance;
    const id = generateId(); const firstStep = workflow.steps[0];
    const instance: WorkflowInstance = { id, workflowId, documentId: version.documentId, documentVersionId, status: 'active', currentStepId: firstStep?.id || '', currentStepNumber: 1, startedAt: now(), startedBy: 'system', stepHistory: firstStep ? [{ id: generateId(), workflowInstanceId: id, stepId: firstStep.id, stepNumber: 1, stepName: firstStep.name, status: 'pending', assignedTo: firstStep.assignedUserIds || [], assignedToNames: firstStep.assignedUserIds || [], isOverdue: false }] : [], workflowData: {} };
    set((state) => ({ workflowInstances: { ...state.workflowInstances, [id]: instance }, instancesByDocument: { ...state.instancesByDocument, [version.documentId]: [...(state.instancesByDocument[version.documentId] || []), id] }, versions: { ...state.versions, [documentVersionId]: { ...version, workflowInstanceId: id } } }));
    return instance;
  },

  executeWorkflowAction: (instanceId, action, comments) => {
    const instance = get().workflowInstances[instanceId]; const workflow = get().workflows[instance?.workflowId]; if (!instance || !workflow) return;
    const currentStep = instance.stepHistory.find(s => s.stepId === instance.currentStepId);
    if (currentStep) {
      const updatedHistory = instance.stepHistory.map(s => s.id === currentStep.id ? { ...s, status: 'completed' as const, completedAt: now(), executedBy: 'system', executedByName: 'System', action, comments } : s);
      const nextStepIndex = workflow.steps.findIndex(s => s.id === instance.currentStepId) + 1;
      const nextStep = workflow.steps[nextStepIndex];
      if (nextStep && action === 'approve') {
        const newStepExec: WorkflowStepExecution = { id: generateId(), workflowInstanceId: instanceId, stepId: nextStep.id, stepNumber: nextStepIndex + 1, stepName: nextStep.name, status: 'pending', assignedTo: nextStep.assignedUserIds || [], assignedToNames: nextStep.assignedUserIds || [], isOverdue: false };
        set((state) => ({ workflowInstances: { ...state.workflowInstances, [instanceId]: { ...instance, currentStepId: nextStep.id, currentStepNumber: nextStepIndex + 1, stepHistory: [...updatedHistory, newStepExec] } } }));
      } else {
        const finalStatus = action === 'reject' ? 'cancelled' : 'completed';
        set((state) => ({ workflowInstances: { ...state.workflowInstances, [instanceId]: { ...instance, status: finalStatus as 'completed' | 'cancelled', completedAt: now(), stepHistory: updatedHistory } } }));
        if (action === 'approve' && !nextStep) get().approveDocument(instance.documentVersionId, 'system', comments);
        if (action === 'reject') get().rejectDocument(instance.documentVersionId, 'system', comments || 'Rejected');
      }
    }
  },

  cancelWorkflow: (instanceId, reason) => { const instance = get().workflowInstances[instanceId]; if (instance) set((state) => ({ workflowInstances: { ...state.workflowInstances, [instanceId]: { ...instance, status: 'cancelled', completedAt: now() } } })); },

  signDocument: (data) => {
    const id = generateId();
    const signature: ElectronicSignature = { id, documentVersionId: data.documentVersionId || '', workflowStepExecutionId: data.workflowStepExecutionId, signerId: data.signerId || 'system', signerName: data.signerName || 'System', signerTitle: data.signerTitle || '', signerEmail: data.signerEmail || '', signatureType: data.signatureType || 'approval', meaning: data.meaning || 'I approve this document', authenticationMethod: data.authenticationMethod || 'password', authenticationTimestamp: now(), signatureHash: `hash-${Date.now()}`, signedAt: now(), isValid: true, manifestation: data.manifestation || 'Electronic signature applied' };
    set((state) => ({ signatures: { ...state.signatures, [id]: signature } }));
    return signature;
  },

  verifySignature: (signatureId) => get().signatures[signatureId]?.isValid ?? false,

  createArchivePolicy: (data) => {
    const id = generateId();
    const policy: ArchivePolicy = { id, policyId: data.policyId || `POL-${Date.now()}`, name: data.name || 'Untitled Policy', description: data.description || '', applicableCategories: data.applicableCategories || [], applicableClassifications: data.applicableClassifications || [], retentionPeriodYears: data.retentionPeriodYears || 15, retentionBasis: data.retentionBasis || 'Regulatory requirement', retentionStartEvent: data.retentionStartEvent || 'effective-date', archiveAction: data.archiveAction || 'retain', destructionApprovalRequired: data.destructionApprovalRequired ?? true, destructionApprovers: data.destructionApprovers || [], isActive: true, createdAt: now(), createdBy: data.createdBy || 'system', updatedAt: now() };
    set((state) => ({ archivePolicies: { ...state.archivePolicies, [id]: policy } }));
    return policy;
  },

  updateArchivePolicy: (id, updates) => { const p = get().archivePolicies[id]; if (p) set((state) => ({ archivePolicies: { ...state.archivePolicies, [id]: { ...p, ...updates, updatedAt: now() } } })); },

  archiveDocument: (documentId, policyId) => {
    const doc = get().documents[documentId]; const policy = get().archivePolicies[policyId]; if (!doc || !policy) return null as unknown as ArchiveRecord;
    const id = generateId(); const expiryDate = new Date(); expiryDate.setFullYear(expiryDate.getFullYear() + policy.retentionPeriodYears);
    const record: ArchiveRecord = { id, documentId, archiveDate: now(), archivedBy: 'system', archiveLocation: `/archive/${documentId}`, archiveFormat: 'pdf-a', retentionPolicyId: policyId, retentionExpiryDate: expiryDate.toISOString(), status: 'archived', isOnLegalHold: doc.legalHoldIds.length > 0, legalHoldIds: doc.legalHoldIds, accessLog: [] };
    set((state) => ({ archiveRecords: { ...state.archiveRecords, [id]: record }, archiveByDocument: { ...state.archiveByDocument, [documentId]: id }, documents: { ...state.documents, [documentId]: { ...doc, archiveStatus: 'archived', updatedAt: now() } } }));
    return record;
  },

  restoreFromArchive: (archiveRecordId) => {
    const record = get().archiveRecords[archiveRecordId]; if (!record) return;
    const doc = get().documents[record.documentId];
    if (doc) set((state) => ({ archiveRecords: { ...state.archiveRecords, [archiveRecordId]: { ...record, status: 'active' } }, documents: { ...state.documents, [record.documentId]: { ...doc, archiveStatus: 'active', updatedAt: now() } } }));
  },

  createLegalHold: (data) => {
    const id = generateId();
    const hold: LegalHold = { id, holdId: data.holdId || `LH-${Date.now()}`, name: data.name || 'Untitled Legal Hold', description: data.description || '', matterName: data.matterName || '', matterNumber: data.matterNumber || '', caseType: data.caseType || 'litigation', custodians: data.custodians || [], documentIds: data.documentIds || [], effectiveDate: data.effectiveDate || now(), status: 'active', issuedBy: data.issuedBy || 'system', issuedByName: data.issuedByName || 'System', issuedAt: now(), updatedAt: now() };
    set((state) => ({ legalHolds: { ...state.legalHolds, [id]: hold } }));
    return hold;
  },

  addDocumentToLegalHold: (holdId, documentId) => {
    const hold = get().legalHolds[holdId]; const doc = get().documents[documentId];
    if (hold && doc) set((state) => ({ legalHolds: { ...state.legalHolds, [holdId]: { ...hold, documentIds: [...hold.documentIds, documentId], updatedAt: now() } }, documents: { ...state.documents, [documentId]: { ...doc, legalHoldIds: [...doc.legalHoldIds, holdId], archiveStatus: 'legal-hold', updatedAt: now() } } }));
  },

  removeDocumentFromLegalHold: (holdId, documentId) => {
    const hold = get().legalHolds[holdId]; const doc = get().documents[documentId];
    if (hold && doc) {
      const remainingHolds = doc.legalHoldIds.filter(h => h !== holdId);
      set((state) => ({ legalHolds: { ...state.legalHolds, [holdId]: { ...hold, documentIds: hold.documentIds.filter(d => d !== documentId), updatedAt: now() } }, documents: { ...state.documents, [documentId]: { ...doc, legalHoldIds: remainingHolds, archiveStatus: remainingHolds.length > 0 ? 'legal-hold' : 'active', updatedAt: now() } } }));
    }
  },

  releaseLegalHold: (holdId, releasedBy) => {
    const hold = get().legalHolds[holdId]; if (!hold) return;
    hold.documentIds.forEach(docId => get().removeDocumentFromLegalHold(holdId, docId));
    set((state) => ({ legalHolds: { ...state.legalHolds, [holdId]: { ...hold, status: 'released', releasedDate: now(), releasedBy, releasedByName: releasedBy, updatedAt: now() } } }));
  },

  searchDocuments: (query) => {
    const docs = Object.values(get().documents);
    let filtered = docs;
    if (query.queryText) { const q = query.queryText.toLowerCase(); filtered = filtered.filter(d => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.keywords.some(k => k.toLowerCase().includes(q))); }
    if (query.categories?.length) filtered = filtered.filter(d => query.categories!.includes(d.category));
    if (query.statuses?.length) filtered = filtered.filter(d => query.statuses!.includes(d.status));
    if (query.fileFormats?.length) filtered = filtered.filter(d => query.fileFormats!.includes(d.fileFormat));
    const results: SearchResultDocument[] = filtered.slice(query.offset, query.offset + query.limit).map(d => ({ documentId: d.documentId, title: d.title, description: d.description, category: d.category, status: d.status, version: d.version, relevanceScore: 0.95, matchedFields: ['title'], highlightedSnippets: [], authorName: d.authorName, createdAt: d.createdAt, updatedAt: d.updatedAt, fileFormat: d.fileFormat, pageCount: d.pageCount }));
    const result: DocumentSearchResult = { id: generateId(), queryId: query.id, totalCount: filtered.length, documents: results, categoryFacets: [], statusFacets: [], authorFacets: [], formatFacets: [], executedAt: now(), executionTimeMs: 15 };
    set({ searchResults: result, recentSearches: [query, ...get().recentSearches.slice(0, 9)] });
    return result;
  },

  saveSearch: (query, name) => { const savedQuery = { ...query, id: generateId() }; set((state) => ({ savedSearches: { ...state.savedSearches, [savedQuery.id]: savedQuery } })); },
  deleteSavedSearch: (queryId) => { set((state) => { const { [queryId]: _, ...rest } = state.savedSearches; return { savedSearches: rest }; }); },

  analyzeContentReuse: (documentId) => {
    const doc = get().documents[documentId]; if (!doc) return null as unknown as ContentReuseAnalysis;
    const analysis: ContentReuseAnalysis = {
      id: generateId(), documentId, analyzedAt: now(),
      similarDocuments: Object.values(get().documents).filter(d => d.id !== documentId && d.category === doc.category).slice(0, 5).map(d => ({ documentId: d.id, documentTitle: d.title, similarityScore: 0.65 + Math.random() * 0.3, matchedSections: ['Introduction', 'Methods'], matchType: 'similar' as const })),
      reuseOpportunities: [{ id: generateId(), sourceDocumentId: documentId, sourceSectionId: 'sec-1', targetDocumentId: 'doc-2', targetSectionId: 'sec-1', similarity: 0.85, recommendation: 'Consider creating a shared component' }],
      componentCandidates: [{ id: generateId(), sectionId: 'sec-intro', content: 'Standard introduction text...', occurrenceCount: 5, documents: ['doc-1', 'doc-2', 'doc-3'], suggestedComponentType: 'boilerplate', automationPotential: 'high' }]
    };
    set((state) => ({ contentReuseAnalyses: { ...state.contentReuseAnalyses, [documentId]: analysis } }));
    return analysis;
  },

  calculateAnalytics: () => {
    const docs = Object.values(get().documents); const versions = Object.values(get().versions);
    const now30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const analytics: DocumentAnalytics = {
      totalDocuments: docs.length, totalVersions: versions.length, totalStorageBytes: docs.reduce((sum, d) => sum + d.fileSize, 0),
      documentsByCategory: { regulatory: 0, clinical: 0, safety: 0, quality: 0, manufacturing: 0, nonclinical: 0, cmc: 0, labeling: 0, correspondence: 0, administrative: 0, training: 0, reference: 0, template: 0, archive: 0 },
      documentsByStatus: { draft: 0, 'in-review': 0, 'pending-approval': 0, approved: 0, effective: 0, superseded: 0, retired: 0, archived: 0, 'on-hold': 0, rejected: 0 },
      documentsByClassification: { controlled: 0, uncontrolled: 0, reference: 0, working: 0, archive: 0, template: 0 },
      documentsCreatedLast30Days: docs.filter(d => new Date(d.createdAt).getTime() > now30).length,
      documentsModifiedLast30Days: docs.filter(d => new Date(d.updatedAt).getTime() > now30).length,
      averageVersionsPerDocument: docs.length > 0 ? versions.length / docs.length : 0,
      activeReviewCycles: Object.values(get().reviewCycles).filter(r => r.status === 'in-progress').length,
      pendingApprovals: docs.filter(d => d.status === 'pending-approval').length,
      averageReviewDays: 5.5, documentsInArchive: docs.filter(d => d.archiveStatus === 'archived').length,
      documentsOnLegalHold: docs.filter(d => d.legalHoldIds.length > 0).length,
      documentsNearingRetention: docs.filter(d => d.retentionExpiryDate && new Date(d.retentionExpiryDate).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000).length,
      creationTrend: [], modificationTrend: [], reviewCompletionTrend: []
    };
    docs.forEach(d => { if (analytics.documentsByCategory[d.category] !== undefined) analytics.documentsByCategory[d.category]++; if (analytics.documentsByStatus[d.status] !== undefined) analytics.documentsByStatus[d.status]++; if (analytics.documentsByClassification[d.classification] !== undefined) analytics.documentsByClassification[d.classification]++; });
    set({ analytics });
    return analytics;
  },

  linkToModule: (documentId, moduleType, moduleEntityId, linkType) => {
    const doc = get().documents[documentId]; if (!doc) return null as unknown as ModuleDocumentMapping;
    const id = generateId();
    const mapping: ModuleDocumentMapping = { id, documentId, moduleType, moduleEntityId, moduleEntityType: moduleType, moduleEntityName: moduleEntityId, linkType, syncEnabled: true, syncStatus: 'synced', createdAt: now(), createdBy: 'system' };
    set((state) => ({ moduleMappings: { ...state.moduleMappings, [id]: mapping }, mappingsByDocument: { ...state.mappingsByDocument, [documentId]: [...(state.mappingsByDocument[documentId] || []), id] } }));
    return mapping;
  },

  unlinkFromModule: (mappingId) => {
    const mapping = get().moduleMappings[mappingId]; if (!mapping) return;
    set((state) => {
      const { [mappingId]: _, ...rest } = state.moduleMappings;
      return { moduleMappings: rest, mappingsByDocument: { ...state.mappingsByDocument, [mapping.documentId]: (state.mappingsByDocument[mapping.documentId] || []).filter(m => m !== mappingId) } };
    });
  },

  syncWithModule: (mappingId) => { const mapping = get().moduleMappings[mappingId]; if (mapping) set((state) => ({ moduleMappings: { ...state.moduleMappings, [mappingId]: { ...mapping, lastSyncAt: now(), syncStatus: 'synced' } } })); },

  setSelectedDocumentId: (id) => set({ selectedDocumentId: id }),
  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
  setSelectedReviewCycleId: (id) => set({ selectedReviewCycleId: id }),
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
  setActiveView: (view) => set({ activeView: view }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearFilters: () => set({ filters: initialFilters }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // v144: Enhanced loadMockData with full document lifecycle examples
  loadMockData: () => {
    // ============================================================================
    // DOCUMENT LIFECYCLE DEMO DATA - v144
    // Shows documents with full version histories demonstrating regulatory lifecycle
    // ============================================================================

    // 1. Investigator's Brochure - 5 versions (annual updates + safety signals)
    const ib = get().createDocument({
      documentId: 'DOC-2023-00045', title: "Investigator's Brochure - LIG-2847 (Nexavant)",
      description: 'Comprehensive investigator information for LIG-2847, a selective JAK1 inhibitor',
      category: 'clinical', classification: 'controlled', status: 'effective',
      version: '3.1', majorVersion: 3, minorVersion: 1, patchVersion: 0,
      authorName: 'Dr. Sarah Chen', ownerName: 'Dr. Sarah Chen', ownerDepartment: 'Clinical Development',
      fileFormat: 'pdf', fileSize: 4250000, pageCount: 185,
      tags: ['investigator-brochure', 'phase-3', 'rheumatoid-arthritis', 'JAK-inhibitor'],
      keywords: ['LIG-2847', 'Nexavant', 'JAK1', 'investigator brochure'],
      effectiveDate: '2024-11-10T00:00:00Z',
      versionHistory: [
        { versionId: 'ib-v1', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2023-03-15T09:00:00Z', createdBy: 'Dr. Sarah Chen', changeDescription: 'Initial IB - Phase 1 program initiation', status: 'superseded' as const },
        { versionId: 'ib-v2', version: '2.0', majorVersion: 2, minorVersion: 0, patchVersion: 0, createdAt: '2023-09-22T14:30:00Z', createdBy: 'Dr. Sarah Chen', changeDescription: 'Major update: Phase 1 safety/efficacy data, updated preclinical findings', status: 'superseded' as const },
        { versionId: 'ib-v3', version: '2.3', majorVersion: 2, minorVersion: 3, patchVersion: 0, createdAt: '2024-02-10T11:15:00Z', createdBy: 'Dr. Maria Garcia', changeDescription: 'Safety update: New hepatic monitoring per DSMB recommendation', status: 'superseded' as const },
        { versionId: 'ib-v4', version: '3.0', majorVersion: 3, minorVersion: 0, patchVersion: 0, createdAt: '2024-06-18T16:45:00Z', createdBy: 'Dr. Sarah Chen', changeDescription: 'Major revision: Phase 2 efficacy, updated risk/benefit per FDA Type B feedback', status: 'superseded' as const },
        { versionId: 'ib-v5', version: '3.1', majorVersion: 3, minorVersion: 1, patchVersion: 0, createdAt: '2024-11-05T10:00:00Z', createdBy: 'Dr. Maria Garcia', changeDescription: 'Annual update: Integrated DSUR findings, updated worldwide MA status', status: 'effective' as const },
      ],
    });

    // 2. Clinical Protocol - 3 versions (FDA amendment + admin update)
    const proto = get().createDocument({
      documentId: 'DOC-2023-00012', title: 'Clinical Study Protocol LIG-2847-301 (NEXUS-RA)',
      description: 'Phase 3 randomized, double-blind, placebo-controlled efficacy and safety study',
      category: 'clinical', classification: 'controlled', status: 'effective',
      version: '2.1', majorVersion: 2, minorVersion: 1, patchVersion: 0,
      authorName: 'Dr. James Wilson', ownerName: 'Dr. James Wilson', ownerDepartment: 'Clinical Operations',
      fileFormat: 'pdf', fileSize: 3850000, pageCount: 142,
      tags: ['protocol', 'phase-3', 'NEXUS-RA', 'amendment-1'],
      keywords: ['protocol', 'Phase 3', 'LIG-2847-301'],
      effectiveDate: '2024-03-15T00:00:00Z',
      versionHistory: [
        { versionId: 'proto-v1', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2023-01-20T10:00:00Z', createdBy: 'Dr. James Wilson', changeDescription: 'Initial protocol for Phase 3 NEXUS-RA study', status: 'superseded' as const },
        { versionId: 'proto-v2', version: '2.0', majorVersion: 2, minorVersion: 0, patchVersion: 0, createdAt: '2023-06-14T15:30:00Z', createdBy: 'Dr. James Wilson', changeDescription: 'Amendment 1: Added biomarker substudy per FDA Type B meeting, expanded hepatic exclusions', status: 'superseded' as const },
        { versionId: 'proto-v3', version: '2.1', majorVersion: 2, minorVersion: 1, patchVersion: 0, createdAt: '2024-03-08T09:45:00Z', createdBy: 'Dr. Emily Roberts', changeDescription: 'Administrative: Updated site list, clarified visit windows per investigator feedback', status: 'effective' as const },
      ],
    });

    // 3. Clinical Study Report - 5 versions (full authoring lifecycle)
    const csr = get().createDocument({
      documentId: 'DOC-2024-00089', title: 'Clinical Study Report - LIG-2847-301 (NEXUS-RA)',
      description: 'Full CSR for pivotal Phase 3 NEXUS-RA trial',
      category: 'clinical', classification: 'controlled', status: 'effective',
      version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0,
      authorName: 'Dr. Amanda Foster', ownerName: 'Dr. Amanda Foster', ownerDepartment: 'Medical Writing',
      fileFormat: 'pdf', fileSize: 18500000, pageCount: 892,
      tags: ['csr', 'phase-3', 'NEXUS-RA', 'final', 'submission-ready'],
      keywords: ['clinical study report', 'CSR', 'efficacy', 'safety'],
      effectiveDate: '2024-11-25T00:00:00Z',
      versionHistory: [
        { versionId: 'csr-v1', version: '0.1', majorVersion: 0, minorVersion: 1, patchVersion: 0, createdAt: '2024-08-15T14:00:00Z', createdBy: 'Dr. Amanda Foster', changeDescription: 'Initial draft - shell structure with sections 1-8', status: 'superseded' as const },
        { versionId: 'csr-v2', version: '0.5', majorVersion: 0, minorVersion: 5, patchVersion: 0, createdAt: '2024-09-20T11:30:00Z', createdBy: 'Dr. Amanda Foster', changeDescription: 'Working draft - efficacy/safety sections complete, pending MW review', status: 'superseded' as const },
        { versionId: 'csr-v3', version: '0.8', majorVersion: 0, minorVersion: 8, patchVersion: 0, createdAt: '2024-10-18T16:00:00Z', createdBy: 'Dr. Amanda Foster', changeDescription: 'Review draft - integrated MW comments, QC-ready', status: 'superseded' as const },
        { versionId: 'csr-v4', version: '0.9', majorVersion: 0, minorVersion: 9, patchVersion: 0, createdAt: '2024-11-08T09:15:00Z', createdBy: 'Lisa Anderson', changeDescription: 'Post-QC draft - addressed 47 QC findings, minor editorial corrections', status: 'superseded' as const },
        { versionId: 'csr-v5', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2024-11-25T10:00:00Z', createdBy: 'Dr. Amanda Foster', changeDescription: 'Final version - approved for regulatory submission', status: 'effective' as const },
      ],
    });

    // 4. Module 2.5 Clinical Overview - 3 versions (IR response workflow)
    const clinOverview = get().createDocument({
      documentId: 'DOC-2024-00056', title: 'Module 2.5 Clinical Overview - LIG-2847 (Nexavant)',
      description: 'CTD Module 2.5 summarizing clinical development and benefit-risk',
      category: 'regulatory', classification: 'controlled', status: 'in-review',
      version: '2.0', majorVersion: 2, minorVersion: 0, patchVersion: 0,
      authorName: 'Dr. James Wilson', ownerName: 'Dr. James Wilson', ownerDepartment: 'Regulatory Affairs',
      fileFormat: 'pdf', fileSize: 2150000, pageCount: 98,
      tags: ['ctd', 'module-2.5', 'clinical-overview', 'ir-response'],
      keywords: ['clinical overview', 'CTD', 'Module 2.5', 'benefit-risk'],
      versionHistory: [
        { versionId: 'co-v1', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2024-06-01T09:00:00Z', createdBy: 'Dr. James Wilson', changeDescription: 'Initial submission version for NDA 215847', status: 'superseded' as const },
        { versionId: 'co-v2', version: '1.1', majorVersion: 1, minorVersion: 1, patchVersion: 0, createdAt: '2024-09-15T14:00:00Z', createdBy: 'Dr. James Wilson', changeDescription: 'Minor update: Corrected Table 2.5.4-1 patient disposition', status: 'superseded' as const },
        { versionId: 'co-v3', version: '2.0', majorVersion: 2, minorVersion: 0, patchVersion: 0, createdAt: '2024-12-10T11:30:00Z', createdBy: 'Dr. James Wilson', changeDescription: 'IR Response: Expanded benefit-risk per HAQ-001, added elderly subgroup per HAQ-003', status: 'in-review' as const },
      ],
    });

    // 5. DSUR 2024 - 3 versions (annual safety cycle)
    const dsur24 = get().createDocument({
      documentId: 'DOC-2024-00112', title: 'Development Safety Update Report (DSUR) 2024 - LIG-2847',
      description: 'Annual DSUR covering Dec 20, 2023 to Dec 19, 2024',
      category: 'safety', classification: 'controlled', status: 'approved',
      version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0,
      authorName: 'Dr. Maria Garcia', ownerName: 'Dr. Maria Garcia', ownerDepartment: 'Pharmacovigilance',
      fileFormat: 'pdf', fileSize: 5650000, pageCount: 245,
      tags: ['dsur', 'annual-safety', 'aggregate-report', '2024'],
      keywords: ['DSUR', 'safety', 'periodic', 'development safety update report'],
      effectiveDate: '2024-12-15T00:00:00Z',
      versionHistory: [
        { versionId: 'dsur24-v1', version: '0.5', majorVersion: 0, minorVersion: 5, patchVersion: 0, createdAt: '2024-11-01T10:00:00Z', createdBy: 'Dr. Maria Garcia', changeDescription: 'Draft for PV review - data through Oct 31, 2024', status: 'superseded' as const },
        { versionId: 'dsur24-v2', version: '0.9', majorVersion: 0, minorVersion: 9, patchVersion: 0, createdAt: '2024-11-20T14:00:00Z', createdBy: 'Dr. Maria Garcia', changeDescription: 'Post-review draft - incorporated PV comments, QC pending', status: 'superseded' as const },
        { versionId: 'dsur24-v3', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2024-12-15T09:00:00Z', createdBy: 'Dr. Maria Garcia', changeDescription: 'Final DSUR for DIBD anniversary (Dec 20, 2024)', status: 'approved' as const },
      ],
    });

    // 6. Risk Management Plan - 3 versions (post-market evolution)
    const rmp = get().createDocument({
      documentId: 'DOC-2024-00078', title: 'Risk Management Plan - Oncorix (LIG-1182)',
      description: 'EU Risk Management Plan for Oncorix (ligamab), HER2-targeted ADC',
      category: 'safety', classification: 'controlled', status: 'pending-approval',
      version: '2.0', majorVersion: 2, minorVersion: 0, patchVersion: 0,
      authorName: 'Elena Vasquez', ownerName: 'Elena Vasquez', ownerDepartment: 'EU Regulatory Affairs',
      fileFormat: 'pdf', fileSize: 3250000, pageCount: 156,
      tags: ['rmp', 'risk-management', 'eu', 'post-approval'],
      keywords: ['RMP', 'risk management plan', 'pharmacovigilance', 'Oncorix'],
      versionHistory: [
        { versionId: 'rmp-v1', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2024-07-15T11:00:00Z', createdBy: 'Elena Vasquez', changeDescription: 'Initial RMP for MAA submission - EU requirements', status: 'superseded' as const },
        { versionId: 'rmp-v2', version: '1.2', majorVersion: 1, minorVersion: 2, patchVersion: 0, createdAt: '2024-09-28T15:00:00Z', createdBy: 'Elena Vasquez', changeDescription: 'Updated per CHMP Day 120 - enhanced hepatotoxicity monitoring, PASS commitment', status: 'superseded' as const },
        { versionId: 'rmp-v3', version: '2.0', majorVersion: 2, minorVersion: 0, patchVersion: 0, createdAt: '2024-12-01T10:30:00Z', createdBy: 'Elena Vasquez', changeDescription: 'Post-approval: Added ILD as identified risk, updated educational materials', status: 'pending-approval' as const },
      ],
    });

    // 7. DSUR 2023 - Historical reference (completed)
    const dsur23 = get().createDocument({
      documentId: 'DOC-2023-00098', title: 'Development Safety Update Report (DSUR) 2023 - LIG-2847',
      description: 'Annual DSUR covering Dec 20, 2022 to Dec 19, 2023',
      category: 'safety', classification: 'controlled', status: 'effective',
      version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0,
      authorName: 'Dr. Maria Garcia', ownerName: 'Dr. Maria Garcia', ownerDepartment: 'Pharmacovigilance',
      fileFormat: 'pdf', fileSize: 4890000, pageCount: 218,
      tags: ['dsur', 'annual-safety', 'aggregate-report', '2023', 'archived'],
      keywords: ['DSUR', 'safety', 'periodic', '2023'],
      effectiveDate: '2023-12-15T00:00:00Z',
      versionHistory: [
        { versionId: 'dsur23-v1', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2023-12-15T10:00:00Z', createdBy: 'Dr. Maria Garcia', changeDescription: 'Final DSUR Year 3 - submitted to all IND-holding authorities', status: 'effective' as const },
      ],
    });

    // 8. US Prescribing Information - 3 versions (label negotiation)
    const uspi = get().createDocument({
      documentId: 'DOC-2024-00067', title: 'US Prescribing Information (USPI) - Nexavant',
      description: 'FDA-approved prescribing information for Nexavant tablets',
      category: 'labeling', classification: 'controlled', status: 'effective',
      version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0,
      authorName: 'Jennifer Walsh', ownerName: 'Jennifer Walsh', ownerDepartment: 'Regulatory Affairs',
      fileFormat: 'pdf', fileSize: 485000, pageCount: 24,
      tags: ['uspi', 'labeling', 'fda-approved', 'nexavant'],
      keywords: ['USPI', 'prescribing information', 'label', 'Nexavant'],
      effectiveDate: '2024-10-15T00:00:00Z',
      versionHistory: [
        { versionId: 'uspi-v1', version: '0.5', majorVersion: 0, minorVersion: 5, patchVersion: 0, createdAt: '2024-05-10T09:00:00Z', createdBy: 'Jennifer Walsh', changeDescription: 'Initial draft USPI based on clinical data package', status: 'superseded' as const },
        { versionId: 'uspi-v2', version: '0.8', majorVersion: 0, minorVersion: 8, patchVersion: 0, createdAt: '2024-07-22T14:00:00Z', createdBy: 'Jennifer Walsh', changeDescription: 'Revised per FDA labeling negotiation - strengthened hepatic warnings', status: 'superseded' as const },
        { versionId: 'uspi-v3', version: '1.0', majorVersion: 1, minorVersion: 0, patchVersion: 0, createdAt: '2024-10-15T11:00:00Z', createdBy: 'Jennifer Walsh', changeDescription: 'FDA-approved labeling for NDA 215847', status: 'effective' as const },
      ],
    });

    // Templates
    get().createTemplate({ name: 'Clinical Study Report Template', category: 'clinical', documentType: 'CSR', structure: [{ id: 'sec-1', sectionNumber: '1', title: 'Synopsis', level: 1, contentType: 'variable', isRequired: true, subsections: [] }] });
    get().createTemplate({ name: 'CTD Module 2.5 Template', category: 'regulatory', documentType: 'Module 2.5' });
    get().createTemplate({ name: "Investigator's Brochure Template", category: 'clinical', documentType: 'IB' });
    get().createTemplate({ name: 'DSUR Template (ICH E2F)', category: 'safety', documentType: 'DSUR' });

    // Components
    get().createComponent({ name: 'Standard Safety Disclaimer', category: 'safety', componentType: 'disclaimer', content: 'This document contains safety information...', status: 'effective' });
    get().createComponent({ name: 'Confidentiality Statement', category: 'regulatory', componentType: 'boilerplate', content: 'This document is confidential...', status: 'effective' });
    get().createComponent({ name: 'Benefit-Risk Summary', category: 'regulatory', componentType: 'boilerplate', content: 'The benefit-risk assessment considers...', status: 'effective' });

    // Workflows
    get().createWorkflow({ name: 'Standard Document Approval', documentCategories: ['regulatory', 'clinical', 'safety'], steps: [{ id: 'step-1', stepNumber: 1, name: 'QC Review', description: 'Quality check', stepType: 'review', assignmentType: 'role', isRequired: true, requiresAllApprovers: false, minApprovers: 1, allowedActions: ['approve', 'reject', 'request-revision'] }, { id: 'step-2', stepNumber: 2, name: 'Management Approval', description: 'Final approval', stepType: 'approval', assignmentType: 'role', isRequired: true, requiresAllApprovers: true, minApprovers: 1, allowedActions: ['approve', 'reject'] }], transitions: [] });
    get().createWorkflow({ name: 'CSR Final Approval', documentCategories: ['clinical'], steps: [{ id: 'step-1', stepNumber: 1, name: 'Medical Writing QC', description: 'Technical accuracy', stepType: 'review', assignmentType: 'role', isRequired: true, requiresAllApprovers: false, minApprovers: 1, allowedActions: ['approve', 'reject', 'request-revision'] }, { id: 'step-2', stepNumber: 2, name: 'Biostatistics Sign-off', description: 'Statistical methods', stepType: 'approval', assignmentType: 'role', isRequired: true, requiresAllApprovers: true, minApprovers: 1, allowedActions: ['approve', 'reject'] }], transitions: [] });

    // Policies
    get().createArchivePolicy({ name: 'Regulatory Submission Retention', applicableCategories: ['regulatory', 'clinical'], retentionPeriodYears: 15, retentionBasis: '21 CFR Part 11' });
    get().createArchivePolicy({ name: 'Safety Report Retention', applicableCategories: ['safety'], retentionPeriodYears: 25, retentionBasis: 'ICH E2E' });

    // Review cycle on CSR
    const cycle = get().createReviewCycle({ documentId: csr.id, reviewType: 'internal', reviewPurpose: 'Final CSR approval review' });
    get().assignReviewer(cycle.id, { reviewerId: 'user-1', reviewerName: 'Dr. Emily Roberts', role: 'primary' });
    get().assignReviewer(cycle.id, { reviewerId: 'user-2', reviewerName: 'Dr. Michael Lee', role: 'subject-matter-expert' });

    get().calculateAnalytics();
  },

  clearAll: () => set(initialState)
}));

// ============================================================================
// SELECTOR HOOKS - Wrapped with useMemo for stable references
// ============================================================================

// Documents
export const useDocuments = () => {
  const documents = useDocumentControlStore((state) => state.documents);
  return useMemo(() => Object.values(documents), [documents]);
};

export const useSelectedDocument = () => {
  const documents = useDocumentControlStore((state) => state.documents);
  const selectedId = useDocumentControlStore((state) => state.selectedDocumentId);
  return useMemo(() => selectedId ? documents[selectedId] : null, [documents, selectedId]);
};

export const useDocumentsByCategory = (category: string) => {
  const documents = useDocumentControlStore((state) => state.documents);
  return useMemo(() => Object.values(documents).filter(d => d.category === category), [documents, category]);
};

export const useDocumentsByStatus = (status: string) => {
  const documents = useDocumentControlStore((state) => state.documents);
  return useMemo(() => Object.values(documents).filter(d => d.status === status), [documents, status]);
};

// Templates
export const useTemplates = () => {
  const templates = useDocumentControlStore((state) => state.templates);
  return useMemo(() => Object.values(templates), [templates]);
};

export const useSelectedTemplate = () => {
  const templates = useDocumentControlStore((state) => state.templates);
  const selectedId = useDocumentControlStore((state) => state.selectedTemplateId);
  return useMemo(() => selectedId ? templates[selectedId] : null, [templates, selectedId]);
};

export const useActiveTemplates = () => {
  const templates = useDocumentControlStore((state) => state.templates);
  return useMemo(() => Object.values(templates).filter(t => t.isActive), [templates]);
};

// Components
export const useComponents = () => {
  const components = useDocumentControlStore((state) => state.components);
  return useMemo(() => Object.values(components), [components]);
};

export const useEffectiveComponents = () => {
  const components = useDocumentControlStore((state) => state.components);
  return useMemo(() => Object.values(components).filter(c => c.status === 'effective'), [components]);
};

// Assemblies
export const useAssemblies = () => {
  const assemblies = useDocumentControlStore((state) => state.assemblies);
  return useMemo(() => Object.values(assemblies), [assemblies]);
};

// Review Cycles
export const useReviewCycles = () => {
  const reviewCycles = useDocumentControlStore((state) => state.reviewCycles);
  return useMemo(() => Object.values(reviewCycles), [reviewCycles]);
};

export const useSelectedReviewCycle = () => {
  const reviewCycles = useDocumentControlStore((state) => state.reviewCycles);
  const selectedId = useDocumentControlStore((state) => state.selectedReviewCycleId);
  return useMemo(() => selectedId ? reviewCycles[selectedId] : null, [reviewCycles, selectedId]);
};

export const useActiveReviewCycles = () => {
  const reviewCycles = useDocumentControlStore((state) => state.reviewCycles);
  return useMemo(() => Object.values(reviewCycles).filter(r => r.status === 'in-progress'), [reviewCycles]);
};

// Annotations
export const useAnnotations = () => {
  const annotations = useDocumentControlStore((state) => state.annotations);
  return useMemo(() => Object.values(annotations), [annotations]);
};

export const useOpenAnnotations = () => {
  const annotations = useDocumentControlStore((state) => state.annotations);
  return useMemo(() => Object.values(annotations).filter(a => a.status === 'open'), [annotations]);
};

// Workflows
export const useWorkflows = () => {
  const workflows = useDocumentControlStore((state) => state.workflows);
  return useMemo(() => Object.values(workflows), [workflows]);
};

export const useSelectedWorkflow = () => {
  const workflows = useDocumentControlStore((state) => state.workflows);
  const selectedId = useDocumentControlStore((state) => state.selectedWorkflowId);
  return useMemo(() => selectedId ? workflows[selectedId] : null, [workflows, selectedId]);
};

export const useWorkflowInstances = () => {
  const instances = useDocumentControlStore((state) => state.workflowInstances);
  return useMemo(() => Object.values(instances), [instances]);
};

export const useActiveWorkflowInstances = () => {
  const instances = useDocumentControlStore((state) => state.workflowInstances);
  return useMemo(() => Object.values(instances).filter(i => i.status === 'active'), [instances]);
};

// Signatures
export const useSignatures = () => {
  const signatures = useDocumentControlStore((state) => state.signatures);
  return useMemo(() => Object.values(signatures), [signatures]);
};

// Archive & Legal
export const useArchivePolicies = () => {
  const policies = useDocumentControlStore((state) => state.archivePolicies);
  return useMemo(() => Object.values(policies), [policies]);
};

export const useLegalHolds = () => {
  const holds = useDocumentControlStore((state) => state.legalHolds);
  return useMemo(() => Object.values(holds), [holds]);
};

export const useActiveLegalHolds = () => {
  const holds = useDocumentControlStore((state) => state.legalHolds);
  return useMemo(() => Object.values(holds).filter(h => h.status === 'active'), [holds]);
};

export const useArchiveRecords = () => {
  const records = useDocumentControlStore((state) => state.archiveRecords);
  return useMemo(() => Object.values(records), [records]);
};

// UI State - stable selectors
export const useDocControlAnalytics = () => useDocumentControlStore((state) => state.analytics);
export const useDocControlFilters = () => useDocumentControlStore((state) => state.filters);
export const useDocControlActiveView = () => useDocumentControlStore((state) => state.activeView);
export const useDocControlLoading = () => useDocumentControlStore((state) => state.isLoading);
export const useDocControlError = () => useDocumentControlStore((state) => state.error);

// Relationship selectors
export const useVersionsForDocument = (documentId: string) => {
  const versions = useDocumentControlStore((state) => state.versions);
  const versionsByDocument = useDocumentControlStore((state) => state.versionsByDocument);
  return useMemo(() => (versionsByDocument[documentId] || []).map(id => versions[id]).filter(Boolean), [versions, versionsByDocument, documentId]);
};

export const useModuleMappingsForDocument = (documentId: string) => {
  const mappings = useDocumentControlStore((state) => state.moduleMappings);
  const mappingsByDocument = useDocumentControlStore((state) => state.mappingsByDocument);
  return useMemo(() => (mappingsByDocument[documentId] || []).map(id => mappings[id]).filter(Boolean), [mappings, mappingsByDocument, documentId]);
};

export const useReviewCyclesForDocument = (documentId: string) => {
  const reviewCycles = useDocumentControlStore((state) => state.reviewCycles);
  const reviewCyclesByDocument = useDocumentControlStore((state) => state.reviewCyclesByDocument);
  return useMemo(() => (reviewCyclesByDocument[documentId] || []).map(id => reviewCycles[id]).filter(Boolean), [reviewCycles, reviewCyclesByDocument, documentId]);
};
