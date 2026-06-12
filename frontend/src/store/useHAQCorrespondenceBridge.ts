


import { create } from 'zustand';
import { useMemo } from 'react';
import { HAQuestion, HAQCorrespondence, HAQDiscipline } from '@/types/haq';
import { PendingHandoff, useCrossModuleStore } from './useCrossModuleStore';

// ============================================================================
// TYPES
// ============================================================================

export type CorrespondenceDocumentType = 
  | 'ir-response'
  | 'crl-response'
  | 'day-74-response'
  | 'day-120-response'
  | 'general-correspondence'
  | 'meeting-request'
  | 'information-amendment';

export type CorrespondenceStatus = 
  | 'draft'
  | 'in-preparation'
  | 'under-review'
  | 'qc-pending'
  | 'ready-for-submission'
  | 'submitted';

export interface HAQResponseDocument {
  id: string;
  questionId: string;
  questionNumber: string;
  discipline: HAQDiscipline;
  responseText: string;
  attachments: string[];
  ctdReferences: string[];  // CTD sections referenced in response
  createdAt: string;
  updatedAt: string;
}

export interface CorrespondencePackage {
  id: string;
  title: string;
  applicationId: string;
  applicationNumber: string;
  productName: string;
  correspondenceType: CorrespondenceDocumentType;
  status: CorrespondenceStatus;
  
  // Source HAQ information
  sourceCorrespondenceId?: string;  // Link to HAQCorrespondence
  sourceHandoffId?: string;         // Link to cross-module handoff
  
  // Content
  responses: HAQResponseDocument[];
  coverLetterDraft?: string;
  
  // CTD placement
  targetSection: string;             // Usually '1.12.1' for responses
  targetModule: string;              // 'm1'
  suggestedFileName: string;
  
  // Sequence linkage
  linkedSequenceId?: string;
  
  // Metadata
  dueDate?: string;
  receivedDate?: string;
  questionCount: number;
  disciplines: HAQDiscipline[];
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Auto-population configuration for IR Response sequences
export interface IRSequenceAutoPopulateConfig {
  includeResponseDocument: boolean;
  includeSupportingDocuments: boolean;
  generateCoverLetter: boolean;
  ctdSections: {
    coverLetter: string;      // '1.2'
    responseDocument: string; // '1.12.1'
    supportingDocs: string;   // '1.12.2'
  };
}

// Result of converting HAQ responses to correspondence
export interface ConversionResult {
  success: boolean;
  packageId?: string;
  package?: CorrespondencePackage;
  generatedDocuments: {
    documentId: string;
    title: string;
    section: string;
    fileName: string;
  }[];
  warnings: string[];
  errors: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

// Map HAQ type to correspondence type
export const mapHAQTypeToCorrespondenceType = (
  haqType: string
): CorrespondenceDocumentType => {
  switch (haqType) {
    case 'IR':
      return 'ir-response';
    case 'CRL':
      return 'crl-response';
    case 'Day-74':
      return 'day-74-response';
    case 'Day-120':
      return 'day-120-response';
    case 'RSI':
    case 'GMP':
      return 'general-correspondence';
    default:
      return 'general-correspondence';
  }
};

// Generate appropriate filename for correspondence document
export const generateCorrespondenceFileName = (
  applicationNumber: string,
  correspondenceType: CorrespondenceDocumentType,
  sequenceNumber?: string
): string => {
  const cleanAppNum = applicationNumber.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const typeMap: Record<CorrespondenceDocumentType, string> = {
    'ir-response': 'ir-response',
    'crl-response': 'crl-response',
    'day-74-response': 'd74-response',
    'day-120-response': 'd120-response',
    'general-correspondence': 'correspondence',
    'meeting-request': 'meeting-request',
    'information-amendment': 'info-amendment',
  };
  const typeSlug = typeMap[correspondenceType];
  const seq = sequenceNumber || 'draft';
  return `m1-12-1-${typeSlug}-${cleanAppNum}-${seq}.pdf`;
};

// Generate cover letter template based on correspondence type
export const generateCoverLetterTemplate = (
  pkg: CorrespondencePackage
): string => {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const typeLabels: Record<CorrespondenceDocumentType, string> = {
    'ir-response': 'Information Request Response',
    'crl-response': 'Complete Response Letter Response',
    'day-74-response': 'Day 74 Questions Response',
    'day-120-response': 'Day 120 Questions Response',
    'general-correspondence': 'General Correspondence',
    'meeting-request': 'Meeting Request',
    'information-amendment': 'Information Amendment',
  };

  return `
${today}

Food and Drug Administration
Center for Drug Evaluation and Research
Document Control Room

RE: ${pkg.applicationNumber}
${pkg.productName}
${typeLabels[pkg.correspondenceType]}

Dear Sir/Madam,

This submission provides responses to the ${pkg.questionCount} question(s) received from the Agency regarding the above-referenced application.

The responses address the following discipline areas: ${pkg.disciplines.join(', ')}.

Please refer to Section 1.12.1 for the detailed response document.

We remain available to discuss these responses with the review team at your convenience.

Respectfully submitted,

[Signature Block]
Regulatory Affairs
  `.trim();
};

// Extract CTD references from response text
export const extractCTDReferences = (responseText: string): string[] => {
  const references: string[] = [];
  
  // Match CTD section patterns like "Module 2.5", "Section 3.2.S.2.4", "m5.3.5.1"
  // Pattern explanation: digit(s) followed by dot, then one or more segments of
  // digits/letters followed by dots, ending with digits or letters
  const patterns = [
    /Module\s+(\d+(?:\.[A-Za-z0-9]+)+)/gi,
    /Section\s+(\d+(?:\.[A-Za-z0-9]+)+)/gi,
    /[Mm](\d+(?:\.[A-Za-z0-9]+)+)/g,
    /CTD\s+(\d+(?:\.[A-Za-z0-9]+)+)/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = Array.from(responseText.matchAll(pattern));
    for (const match of matches) {
      const ref = match[1];
      if (!references.includes(ref)) {
        references.push(ref);
      }
    }
  });
  
  return references.sort();
};

// ============================================================================
// STORE
// ============================================================================

interface HAQCorrespondenceBridgeState {
  // Correspondence packages created from HAQ responses
  correspondencePackages: CorrespondencePackage[];
  
  // Mapping between HAQ IDs and correspondence package IDs
  haqToPackageMap: Record<string, string>;
  
  // Pending packages waiting for sequence assignment
  pendingPackages: string[];
  
  // Actions
  convertHAQsToCorrespondence: (
    questions: HAQuestion[],
    correspondenceInfo: {
      applicationId: string;
      applicationNumber: string;
      productName: string;
      correspondenceType: CorrespondenceDocumentType;
      dueDate?: string;
      receivedDate?: string;
      sourceCorrespondenceId?: string;
    },
    createdBy: string
  ) => ConversionResult;
  
  convertHandoffToCorrespondence: (
    handoff: PendingHandoff,
    createdBy: string
  ) => ConversionResult;
  
  updatePackageStatus: (packageId: string, status: CorrespondenceStatus) => void;
  
  linkPackageToSequence: (packageId: string, sequenceId: string) => void;
  
  getPackageById: (packageId: string) => CorrespondencePackage | undefined;
  
  getPackagesForApplication: (applicationId: string) => CorrespondencePackage[];
  
  getPackagesForSequence: (sequenceId: string) => CorrespondencePackage[];
  
  getPendingPackages: () => CorrespondencePackage[];
  
  getCorrespondenceForHAQ: (questionId: string) => CorrespondencePackage | undefined;
  
  // Generate documents for the package (returns document metadata)
  generateDocuments: (packageId: string) => {
    responseDocument: { id: string; title: string; section: string; fileName: string };
    coverLetter?: { id: string; title: string; section: string; fileName: string };
  } | null;
  
  // Auto-populate IR Response sequence
  autoPopulateIRSequence: (
    packageId: string,
    sequenceId: string,
    config: IRSequenceAutoPopulateConfig
  ) => { success: boolean; documentsAdded: number; errors: string[] };
  
  clear: () => void;
}

export const useHAQCorrespondenceBridge = create<HAQCorrespondenceBridgeState>((set, get) => ({
  correspondencePackages: [],
  haqToPackageMap: {},
  pendingPackages: [],
  
  convertHAQsToCorrespondence: (questions, correspondenceInfo, createdBy) => {
    const result: ConversionResult = {
      success: false,
      generatedDocuments: [],
      warnings: [],
      errors: [],
    };
    
    if (questions.length === 0) {
      result.errors.push('No questions provided for conversion');
      return result;
    }
    
    // Validate all questions are from the same application
    const uniqueApps = new Set(questions.map(q => q.applicationId));
    if (uniqueApps.size > 1) {
      result.warnings.push('Questions from multiple applications - using first application');
    }
    
    // Extract unique disciplines
    const disciplines = Array.from(new Set(questions.map(q => q.discipline)));
    
    // Convert questions to response documents
    const responses: HAQResponseDocument[] = questions.map(q => ({
      id: generateId('resp'),
      questionId: q.id,
      questionNumber: q.questionNumber,
      discipline: q.discipline,
      responseText: q.responseText || q.suggestedResponse || '',
      attachments: q.attachments?.map(a => a.name) || [],
      ctdReferences: extractCTDReferences(q.responseText || q.suggestedResponse || ''),
      createdAt: timestamp(),
      updatedAt: timestamp(),
    }));
    
    // Check for incomplete responses
    const incompleteResponses = responses.filter(r => !r.responseText || r.responseText.trim() === '');
    if (incompleteResponses.length > 0) {
      result.warnings.push(
        `${incompleteResponses.length} question(s) have no response text: ${incompleteResponses.map(r => r.questionNumber).join(', ')}`
      );
    }
    
    // Create the correspondence package
    const packageId = generateId('corr-pkg');
    const pkg: CorrespondencePackage = {
      id: packageId,
      title: `${correspondenceInfo.applicationNumber} ${correspondenceInfo.correspondenceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      applicationId: correspondenceInfo.applicationId,
      applicationNumber: correspondenceInfo.applicationNumber,
      productName: correspondenceInfo.productName,
      correspondenceType: correspondenceInfo.correspondenceType,
      status: 'draft',
      sourceCorrespondenceId: correspondenceInfo.sourceCorrespondenceId,
      responses,
      targetSection: '1.12.1',
      targetModule: 'm1',
      suggestedFileName: generateCorrespondenceFileName(
        correspondenceInfo.applicationNumber,
        correspondenceInfo.correspondenceType
      ),
      dueDate: correspondenceInfo.dueDate,
      receivedDate: correspondenceInfo.receivedDate,
      questionCount: questions.length,
      disciplines,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      createdBy,
    };
    
    // Update state
    set(state => {
      const newHaqToPackageMap = { ...state.haqToPackageMap };
      questions.forEach(q => {
        newHaqToPackageMap[q.id] = packageId;
      });
      
      return {
        correspondencePackages: [...state.correspondencePackages, pkg],
        haqToPackageMap: newHaqToPackageMap,
        pendingPackages: [...state.pendingPackages, packageId],
      };
    });
    
    result.success = true;
    result.packageId = packageId;
    result.package = pkg;
    result.generatedDocuments.push({
      documentId: generateId('doc'),
      title: pkg.title,
      section: pkg.targetSection,
      fileName: pkg.suggestedFileName,
    });
    
    return result;
  },
  
  convertHandoffToCorrespondence: (handoff, createdBy) => {
    const metadata = handoff.metadata as {
      correspondenceType?: string;
      applicationNumber?: string;
      productName?: string;
      questionCount?: number;
      disciplines?: string[];
      responses?: {
        questionNumber: string;
        discipline: string;
        responseText: string;
        attachments?: string[];
      }[];
    };
    
    if (!metadata || !metadata.responses) {
      return {
        success: false,
        generatedDocuments: [],
        warnings: [],
        errors: ['Handoff does not contain valid HAQ response data'],
      };
    }
    
    // Convert handoff responses to HAQResponseDocuments
    const responses: HAQResponseDocument[] = metadata.responses.map((r, i) => ({
      id: generateId('resp'),
      questionId: `haq-from-handoff-${i}`,
      questionNumber: r.questionNumber,
      discipline: r.discipline as HAQDiscipline,
      responseText: r.responseText,
      attachments: r.attachments || [],
      ctdReferences: extractCTDReferences(r.responseText),
      createdAt: timestamp(),
      updatedAt: timestamp(),
    }));
    
    const disciplines = Array.from(new Set(responses.map(r => r.discipline)));
    const correspondenceType = mapHAQTypeToCorrespondenceType(
      metadata.correspondenceType || 'IR'
    );
    
    const packageId = generateId('corr-pkg');
    const pkg: CorrespondencePackage = {
      id: packageId,
      title: handoff.sourceTitle,
      applicationId: handoff.sourceId.split('-')[0] || 'unknown',
      applicationNumber: metadata.applicationNumber || 'Unknown',
      productName: metadata.productName || 'Unknown Product',
      correspondenceType,
      status: 'draft',
      sourceHandoffId: handoff.id,
      responses,
      targetSection: handoff.targetSection || '1.12.1',
      targetModule: 'm1',
      suggestedFileName: generateCorrespondenceFileName(
        metadata.applicationNumber || 'unknown',
        correspondenceType
      ),
      questionCount: responses.length,
      disciplines,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      createdBy,
    };
    
    set(state => ({
      correspondencePackages: [...state.correspondencePackages, pkg],
      pendingPackages: [...state.pendingPackages, packageId],
    }));
    
    return {
      success: true,
      packageId,
      package: pkg,
      generatedDocuments: [{
        documentId: generateId('doc'),
        title: pkg.title,
        section: pkg.targetSection,
        fileName: pkg.suggestedFileName,
      }],
      warnings: [],
      errors: [],
    };
  },
  
  updatePackageStatus: (packageId, status) => {
    set(state => ({
      correspondencePackages: state.correspondencePackages.map(pkg =>
        pkg.id === packageId 
          ? { ...pkg, status, updatedAt: timestamp() }
          : pkg
      ),
      // Remove from pending if no longer draft
      pendingPackages: status !== 'draft' && status !== 'in-preparation'
        ? state.pendingPackages.filter(id => id !== packageId)
        : state.pendingPackages,
    }));
  },
  
  linkPackageToSequence: (packageId, sequenceId) => {
    set(state => ({
      correspondencePackages: state.correspondencePackages.map(pkg =>
        pkg.id === packageId
          ? { ...pkg, linkedSequenceId: sequenceId, updatedAt: timestamp() }
          : pkg
      ),
      pendingPackages: state.pendingPackages.filter(id => id !== packageId),
    }));
  },
  
  getPackageById: (packageId) => {
    return get().correspondencePackages.find(pkg => pkg.id === packageId);
  },
  
  getPackagesForApplication: (applicationId) => {
    return get().correspondencePackages.filter(pkg => pkg.applicationId === applicationId);
  },
  
  getPackagesForSequence: (sequenceId) => {
    return get().correspondencePackages.filter(pkg => pkg.linkedSequenceId === sequenceId);
  },
  
  getPendingPackages: () => {
    const { correspondencePackages, pendingPackages } = get();
    return correspondencePackages.filter(pkg => pendingPackages.includes(pkg.id));
  },
  
  getCorrespondenceForHAQ: (questionId) => {
    const { correspondencePackages, haqToPackageMap } = get();
    const packageId = haqToPackageMap[questionId];
    if (!packageId) return undefined;
    return correspondencePackages.find(pkg => pkg.id === packageId);
  },
  
  generateDocuments: (packageId) => {
    const pkg = get().getPackageById(packageId);
    if (!pkg) return null;
    
    const responseDoc = {
      id: generateId('doc'),
      title: `${pkg.applicationNumber} - Response to Questions`,
      section: pkg.targetSection,
      fileName: pkg.suggestedFileName,
    };
    
    // Generate cover letter if not already present
    let coverLetter: typeof responseDoc | undefined;
    if (!pkg.coverLetterDraft) {
      const coverText = generateCoverLetterTemplate(pkg);
      
      set(state => ({
        correspondencePackages: state.correspondencePackages.map(p =>
          p.id === packageId
            ? { ...p, coverLetterDraft: coverText, updatedAt: timestamp() }
            : p
        ),
      }));
      
      coverLetter = {
        id: generateId('doc'),
        title: `${pkg.applicationNumber} - Cover Letter`,
        section: '1.2',
        fileName: `m1-2-cover-letter-${pkg.applicationNumber.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`,
      };
    }
    
    return { responseDocument: responseDoc, coverLetter };
  },
  
  autoPopulateIRSequence: (packageId, sequenceId, config) => {
    const pkg = get().getPackageById(packageId);
    if (!pkg) {
      return { success: false, documentsAdded: 0, errors: ['Package not found'] };
    }
    
    let documentsAdded = 0;
    const errors: string[] = [];
    
    // Link package to sequence
    get().linkPackageToSequence(packageId, sequenceId);
    
    // The actual document assignment would be done through the submissions store
    // Here we just track what should be added
    
    if (config.includeResponseDocument) {
      documentsAdded++;
    }
    
    if (config.generateCoverLetter && !pkg.coverLetterDraft) {
      const coverText = generateCoverLetterTemplate(pkg);
      set(state => ({
        correspondencePackages: state.correspondencePackages.map(p =>
          p.id === packageId
            ? { ...p, coverLetterDraft: coverText, updatedAt: timestamp() }
            : p
        ),
      }));
      documentsAdded++;
    }
    
    if (config.includeSupportingDocuments) {
      const totalAttachments = pkg.responses.reduce(
        (sum, r) => sum + r.attachments.length, 
        0
      );
      documentsAdded += totalAttachments;
    }
    
    return { success: true, documentsAdded, errors };
  },
  
  clear: () => {
    set({
      correspondencePackages: [],
      haqToPackageMap: {},
      pendingPackages: [],
    });
  },
}));

// ============================================================================
// HOOKS
// ============================================================================

// Fixed v167, optimized v168: Extract primitives, compute with useMemo
export const usePendingCorrespondence = () => {
  const correspondencePackages = useHAQCorrespondenceBridge(state => state.correspondencePackages);
  const pendingPackages = useHAQCorrespondenceBridge(state => state.pendingPackages);
  return useMemo(
    () => correspondencePackages.filter(pkg => pendingPackages.includes(pkg.id)),
    [correspondencePackages, pendingPackages]
  );
};

export const useCorrespondenceForApplication = (applicationId: string) => {
  return useHAQCorrespondenceBridge(state => 
    state.correspondencePackages.filter(pkg => pkg.applicationId === applicationId)
  );
};

export const useCorrespondencePackageById = (packageId: string) => {
  return useHAQCorrespondenceBridge(state => 
    state.correspondencePackages.find(pkg => pkg.id === packageId)
  );
};

// ============================================================================
// NON-REACT FUNCTIONS
// ============================================================================

/**
 * Convert a pending handoff to a correspondence package
 * Can be called from non-React contexts
 */
export const processHAQHandoffToCorrespondence = (
  handoffId: string,
  createdBy: string
): ConversionResult => {
  const crossModuleStore = useCrossModuleStore.getState();
  const handoff = crossModuleStore.pendingHandoffs.find(h => h.id === handoffId);
  
  if (!handoff) {
    return {
      success: false,
      generatedDocuments: [],
      warnings: [],
      errors: [`Handoff ${handoffId} not found`],
    };
  }
  
  const bridge = useHAQCorrespondenceBridge.getState();
  const result = bridge.convertHandoffToCorrespondence(handoff, createdBy);
  
  if (result.success) {
    // Mark handoff as accepted
    crossModuleStore.acceptHandoff(handoffId);
  }
  
  return result;
};

/**
 * Get the correspondence package for a given HAQ question
 */
export const getCorrespondenceForQuestion = (questionId: string): CorrespondencePackage | undefined => {
  return useHAQCorrespondenceBridge.getState().getCorrespondenceForHAQ(questionId);
};
