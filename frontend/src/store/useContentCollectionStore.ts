
// ============================================================================
// useContentCollectionStore - v0.38.5
// Auto Content Collection for Regulatory Submissions
// ============================================================================
// Automatically pulls content from:
// - Authoring (approved documents mapped to CTD sections)
// - TMF (required artifacts for Module 1)
// - CMC (drug substance/product data for Module 3)
// - Clinical (CSRs, protocols for Module 5)
// - Safety (DSUR, PBRER for periodic reporting)
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { authoringDocuments } from '@/data/authoring-data';
import type { AuthoringDocument, DocumentStatus } from '@/types/authoring';

// ============================================================================
// TYPES
// ============================================================================

export type ContentSource = 'authoring' | 'tmf' | 'cmc' | 'clinical' | 'safety' | 'upload' | 'reference';
export type ContentStatus = 'available' | 'in-progress' | 'missing' | 'needs-update' | 'draft';
export type CTDModule = '1' | '2' | '3' | '4' | '5';

export interface ContentRequirement {
  id: string;
  ctdSection: string;
  ctdSectionTitle: string;
  module: CTDModule;
  documentType: string;
  documentTitle: string;
  required: boolean;
  submissionTypes: string[]; // Which submission types need this (IND, NDA, etc.)
}

export interface CollectedContent {
  id: string;
  requirementId: string;
  ctdSection: string;
  ctdSectionTitle: string;
  module: CTDModule;
  documentTitle: string;
  source: ContentSource;
  sourceId: string; // ID in source system
  sourceLabel: string; // Human readable reference
  status: ContentStatus;
  version?: string;
  approvedDate?: string;
  approvedBy?: string;
  filePath?: string;
  fileSize?: number;
  lastModified: string;
}

export interface ContentCollectionSummary {
  totalRequired: number;
  available: number;
  inProgress: number;
  missing: number;
  needsUpdate: number;
  byModule: Record<CTDModule, {
    total: number;
    available: number;
    inProgress: number;
    missing: number;
  }>;
  readinessPercent: number;
}

export interface ContentCollectionConfig {
  submissionId: string;
  submissionType: string;
  region: string;
  applicationNumber: string;
  productId: string;
}

// ============================================================================
// CONTENT REQUIREMENTS BY SUBMISSION TYPE
// ============================================================================

const COMMON_REQUIREMENTS: ContentRequirement[] = [
  // Module 1 - Administrative
  { id: 'req-1.2', ctdSection: '1.2', ctdSectionTitle: 'Cover Letter', module: '1', documentType: 'cover-letter', documentTitle: 'Cover Letter', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA', 'sNDA', 'sBLA', 'CTA', 'HAQ-Response'] },
  { id: 'req-1.3.1', ctdSection: '1.3.1', ctdSectionTitle: 'Application Forms', module: '1', documentType: 'form', documentTitle: 'FDA Form 356h', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'sNDA', 'sBLA'] },
  { id: 'req-1.3.1-ema', ctdSection: '1.3.1', ctdSectionTitle: 'Application Forms', module: '1', documentType: 'form', documentTitle: 'EMA Application Form', required: true, submissionTypes: ['MAA', 'CTA'] },
  
  // Module 2 - Summaries
  { id: 'req-2.2', ctdSection: '2.2', ctdSectionTitle: 'Introduction', module: '2', documentType: 'introduction', documentTitle: 'CTD Introduction', required: true, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  { id: 'req-2.3', ctdSection: '2.3', ctdSectionTitle: 'Quality Overall Summary', module: '2', documentType: 'qos', documentTitle: 'Quality Overall Summary', required: true, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  { id: 'req-2.4', ctdSection: '2.4', ctdSectionTitle: 'Nonclinical Overview', module: '2', documentType: 'nonclinical-overview', documentTitle: 'Nonclinical Overview', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  { id: 'req-2.5', ctdSection: '2.5', ctdSectionTitle: 'Clinical Overview', module: '2', documentType: 'clinical-overview', documentTitle: 'Clinical Overview', required: true, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  { id: 'req-2.6', ctdSection: '2.6', ctdSectionTitle: 'Nonclinical Summary', module: '2', documentType: 'nonclinical-summary', documentTitle: 'Nonclinical Written and Tabulated Summaries', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  { id: 'req-2.7', ctdSection: '2.7', ctdSectionTitle: 'Clinical Summary', module: '2', documentType: 'clinical-summary', documentTitle: 'Clinical Summary', required: true, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  
  // Module 3 - Quality (CMC)
  { id: 'req-3.2.S', ctdSection: '3.2.S', ctdSectionTitle: 'Drug Substance', module: '3', documentType: 'drug-substance', documentTitle: 'Drug Substance Information', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  { id: 'req-3.2.P', ctdSection: '3.2.P', ctdSectionTitle: 'Drug Product', module: '3', documentType: 'drug-product', documentTitle: 'Drug Product Information', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  { id: 'req-3.2.A', ctdSection: '3.2.A', ctdSectionTitle: 'Appendices', module: '3', documentType: 'cmc-appendix', documentTitle: 'CMC Appendices', required: false, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  
  // Module 4 - Nonclinical
  { id: 'req-4.2.1', ctdSection: '4.2.1', ctdSectionTitle: 'Pharmacology', module: '4', documentType: 'pharmacology', documentTitle: 'Pharmacology Studies', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  { id: 'req-4.2.2', ctdSection: '4.2.2', ctdSectionTitle: 'Pharmacokinetics', module: '4', documentType: 'pk-nonclinical', documentTitle: 'Nonclinical PK Studies', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  { id: 'req-4.2.3', ctdSection: '4.2.3', ctdSectionTitle: 'Toxicology', module: '4', documentType: 'toxicology', documentTitle: 'Toxicology Studies', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  
  // Module 5 - Clinical
  { id: 'req-5.2', ctdSection: '5.2', ctdSectionTitle: 'Tabular Listings', module: '5', documentType: 'clinical-listings', documentTitle: 'Tabular Listing of All Clinical Studies', required: true, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  { id: 'req-5.3.1.1', ctdSection: '5.3.1.1', ctdSectionTitle: 'BA/BE Reports', module: '5', documentType: 'ba-be', documentTitle: 'BA/BE Study Reports', required: false, submissionTypes: ['NDA', 'sNDA'] },
  { id: 'req-5.3.5.1', ctdSection: '5.3.5.1', ctdSectionTitle: 'Study Reports', module: '5', documentType: 'csr', documentTitle: 'Clinical Study Reports', required: true, submissionTypes: ['IND', 'NDA', 'BLA', 'MAA'] },
  { id: 'req-5.3.5.2', ctdSection: '5.3.5.2', ctdSectionTitle: 'Uncontrolled Studies', module: '5', documentType: 'uncontrolled-csr', documentTitle: 'Uncontrolled Clinical Study Reports', required: false, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  { id: 'req-5.3.5.3', ctdSection: '5.3.5.3', ctdSectionTitle: 'Analyses', module: '5', documentType: 'integrated-analyses', documentTitle: 'ISS/ISE Reports', required: true, submissionTypes: ['NDA', 'BLA', 'MAA'] },
  { id: 'req-5.3.7', ctdSection: '5.3.7', ctdSectionTitle: 'Case Report Forms', module: '5', documentType: 'crf', documentTitle: 'Case Report Forms', required: false, submissionTypes: ['IND', 'NDA', 'BLA'] },
];

// ============================================================================
// DOCUMENT TO CTD SECTION MAPPING
// ============================================================================

const AUTHORING_TO_CTD_MAP: Record<string, string[]> = {
  // Document types -> matching CTD sections
  'cover-letter': ['1.2'],
  'protocol': ['5.3.5.1'],
  'ib': ['5.3.5.1'],
  'csr': ['5.3.5.1'],
  'sap': ['5.3.5.3'],
  'ise': ['5.3.5.3'],
  'iss': ['5.3.5.3'],
  'clinical-overview': ['2.5'],
  'clinical-summary': ['2.7'],
  'nonclinical-overview': ['2.4'],
  'nonclinical-summary': ['2.6'],
  'qos': ['2.3'],
  'introduction': ['2.2'],
  'drug-substance': ['3.2.S'],
  'drug-product': ['3.2.P'],
  'pharmacology': ['4.2.1'],
  'toxicology': ['4.2.3'],
  'dsur': ['5.3.6'],
  'pbrer': ['5.3.6'],
};

// Status mapping from authoring to content status
const STATUS_MAP: Record<DocumentStatus, ContentStatus> = {
  'not-started': 'missing',
  'prerequisites-pending': 'missing',
  'ready-to-start': 'missing',
  'drafting': 'draft',
  'internal-review': 'in-progress',
  'cross-functional-review': 'in-progress',
  'qc-review': 'in-progress',
  'final-review': 'in-progress',
  'approved': 'available',
  'submission-ready': 'available',
  'superseded': 'available',
};

// ============================================================================
// STORE STATE
// ============================================================================

interface ContentCollectionState {
  // Configuration
  config: ContentCollectionConfig | null;
  
  // Requirements based on submission type
  requirements: ContentRequirement[];
  
  // Collected content
  collectedContent: Record<string, CollectedContent>;
  contentIndex: string[];
  
  // State
  isCollecting: boolean;
  lastCollected: string | null;
  
  // Actions
  setConfig: (config: ContentCollectionConfig) => void;
  loadRequirements: (submissionType: string) => void;
  collectFromAuthoring: () => Promise<number>;
  collectFromTMF: () => Promise<number>;
  collectFromCMC: () => Promise<number>;
  collectAll: () => Promise<ContentCollectionSummary>;
  addManualContent: (content: Omit<CollectedContent, 'id' | 'lastModified'>) => string;
  removeContent: (contentId: string) => void;
  updateContentStatus: (contentId: string, status: ContentStatus) => void;
  
  // Queries
  getSummary: () => ContentCollectionSummary;
  getContentForSection: (ctdSection: string) => CollectedContent | undefined;
  getMissingRequirements: () => ContentRequirement[];
  getContentByModule: (module: CTDModule) => CollectedContent[];
  getContentBySource: (source: ContentSource) => CollectedContent[];
  
  // Reset
  clear: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = (prefix: string): string => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const timestamp = (): string => new Date().toISOString();

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useContentCollectionStore = create<ContentCollectionState>()(
  devtools(
    (set, get) => ({
      config: null,
      requirements: [],
      collectedContent: {},
      contentIndex: [],
      isCollecting: false,
      lastCollected: null,
      
      // ========================================================================
      // Configuration
      // ========================================================================
      
      setConfig: (config) => {
        set({ config }, false, 'setConfig');
        get().loadRequirements(config.submissionType);
      },
      
      loadRequirements: (submissionType) => {
        const filtered = COMMON_REQUIREMENTS.filter(req => 
          req.submissionTypes.includes(submissionType)
        );
        set({ requirements: filtered }, false, 'loadRequirements');
      },
      
      // ========================================================================
      // Collection from Sources
      // ========================================================================
      
      collectFromAuthoring: async () => {
        const { config, requirements } = get();
        if (!config) return 0;
        
        set({ isCollecting: true }, false, 'collectFromAuthoring:start');
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let collected = 0;
        const newContent: Record<string, CollectedContent> = { ...get().collectedContent };
        const newIndex: string[] = [...get().contentIndex];
        
        // Scan authoring documents
        authoringDocuments.forEach(doc => {
          // Find matching CTD sections for this document type
          const ctdSections = AUTHORING_TO_CTD_MAP[doc.documentType] || [];
          
          ctdSections.forEach(ctdSection => {
            // Find matching requirement
            const requirement = requirements.find(r => r.ctdSection === ctdSection);
            if (!requirement) return;
            
            // Check if already collected
            const existingId = Object.keys(newContent).find(
              id => newContent[id].ctdSection === ctdSection && newContent[id].sourceId === doc.id
            );
            if (existingId) return;
            
            // Only collect approved/published documents, or note in-progress ones
            const contentStatus = STATUS_MAP[doc.status] || 'missing';
            if (contentStatus === 'draft') return; // Skip drafts
            
            const id = generateId('content');
            const content: CollectedContent = {
              id,
              requirementId: requirement.id,
              ctdSection,
              ctdSectionTitle: requirement.ctdSectionTitle,
              module: requirement.module,
              documentTitle: doc.title,
              source: 'authoring',
              sourceId: doc.id,
              sourceLabel: `Authoring: ${doc.title}`,
              status: contentStatus,
              version: doc.version,
              approvedDate: doc.status === 'approved' || doc.status === 'submission-ready' 
                ? doc.updatedAt 
                : undefined,
              lastModified: timestamp(),
            };
            
            newContent[id] = content;
            newIndex.push(id);
            collected++;
          });
        });
        
        set({
          collectedContent: newContent,
          contentIndex: newIndex,
          isCollecting: false,
          lastCollected: timestamp(),
        }, false, 'collectFromAuthoring:complete');
        
        return collected;
      },
      
      collectFromTMF: async () => {
        const { config, requirements } = get();
        if (!config) return 0;
        
        // Simulate TMF collection - in production would call TMF store
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // TMF provides Module 1 administrative documents
        // For demo, simulate finding some TMF artifacts
        let collected = 0;
        
        // In real implementation:
        // - Query TMF store for submission-ready artifacts
        // - Match to Module 1 requirements (forms, certifications, etc.)
        
        return collected;
      },
      
      collectFromCMC: async () => {
        const { config, requirements } = get();
        if (!config) return 0;
        
        // Simulate CMC collection - in production would call CMC store
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // CMC provides Module 3 documents
        // For demo, simulate finding CMC documents
        let collected = 0;
        
        const newContent: Record<string, CollectedContent> = { ...get().collectedContent };
        const newIndex: string[] = [...get().contentIndex];
        
        // Simulate CMC Drug Substance document
        const dsReq = requirements.find(r => r.ctdSection === '3.2.S');
        if (dsReq) {
          const existingDS = Object.values(newContent).find(c => c.ctdSection === '3.2.S');
          if (!existingDS) {
            const id = generateId('content');
            newContent[id] = {
              id,
              requirementId: dsReq.id,
              ctdSection: '3.2.S',
              ctdSectionTitle: dsReq.ctdSectionTitle,
              module: '3',
              documentTitle: 'Drug Substance Module',
              source: 'cmc',
              sourceId: 'cmc-ds-001',
              sourceLabel: 'CMC: Drug Substance',
              status: 'available',
              version: '2.1',
              approvedDate: timestamp(),
              lastModified: timestamp(),
            };
            newIndex.push(id);
            collected++;
          }
        }
        
        // Simulate CMC Drug Product document
        const dpReq = requirements.find(r => r.ctdSection === '3.2.P');
        if (dpReq) {
          const existingDP = Object.values(newContent).find(c => c.ctdSection === '3.2.P');
          if (!existingDP) {
            const id = generateId('content');
            newContent[id] = {
              id,
              requirementId: dpReq.id,
              ctdSection: '3.2.P',
              ctdSectionTitle: dpReq.ctdSectionTitle,
              module: '3',
              documentTitle: 'Drug Product Module',
              source: 'cmc',
              sourceId: 'cmc-dp-001',
              sourceLabel: 'CMC: Drug Product',
              status: 'in-progress',
              version: '1.8',
              lastModified: timestamp(),
            };
            newIndex.push(id);
            collected++;
          }
        }
        
        set({
          collectedContent: newContent,
          contentIndex: newIndex,
          lastCollected: timestamp(),
        }, false, 'collectFromCMC');
        
        return collected;
      },
      
      collectAll: async () => {
        set({ isCollecting: true }, false, 'collectAll:start');
        
        await get().collectFromAuthoring();
        await get().collectFromTMF();
        await get().collectFromCMC();
        
        set({ isCollecting: false }, false, 'collectAll:complete');
        
        return get().getSummary();
      },
      
      // ========================================================================
      // Manual Content Management
      // ========================================================================
      
      addManualContent: (contentData) => {
        const id = generateId('content');
        const content: CollectedContent = {
          ...contentData,
          id,
          lastModified: timestamp(),
        };
        
        set(state => ({
          collectedContent: { ...state.collectedContent, [id]: content },
          contentIndex: [...state.contentIndex, id],
        }), false, 'addManualContent');
        
        return id;
      },
      
      removeContent: (contentId) => {
        set(state => {
          const { [contentId]: _, ...remaining } = state.collectedContent;
          return {
            collectedContent: remaining,
            contentIndex: state.contentIndex.filter(id => id !== contentId),
          };
        }, false, 'removeContent');
      },
      
      updateContentStatus: (contentId, status) => {
        set(state => ({
          collectedContent: {
            ...state.collectedContent,
            [contentId]: state.collectedContent[contentId]
              ? { ...state.collectedContent[contentId], status, lastModified: timestamp() }
              : state.collectedContent[contentId],
          },
        }), false, 'updateContentStatus');
      },
      
      // ========================================================================
      // Queries
      // ========================================================================
      
      getSummary: () => {
        const { requirements, collectedContent } = get();
        
        const content = Object.values(collectedContent);
        
        const byModule: Record<CTDModule, { total: number; available: number; inProgress: number; missing: number }> = {
          '1': { total: 0, available: 0, inProgress: 0, missing: 0 },
          '2': { total: 0, available: 0, inProgress: 0, missing: 0 },
          '3': { total: 0, available: 0, inProgress: 0, missing: 0 },
          '4': { total: 0, available: 0, inProgress: 0, missing: 0 },
          '5': { total: 0, available: 0, inProgress: 0, missing: 0 },
        };
        
        // Count requirements by module
        requirements.filter(r => r.required).forEach(req => {
          byModule[req.module].total++;
        });
        
        // Count collected content
        content.forEach(c => {
          if (c.status === 'available') byModule[c.module].available++;
          else if (c.status === 'in-progress') byModule[c.module].inProgress++;
        });
        
        // Calculate missing
        Object.keys(byModule).forEach(m => {
          const mod = m as CTDModule;
          byModule[mod].missing = Math.max(0, byModule[mod].total - byModule[mod].available - byModule[mod].inProgress);
        });
        
        const totalRequired = requirements.filter(r => r.required).length;
        const available = content.filter(c => c.status === 'available').length;
        const inProgress = content.filter(c => c.status === 'in-progress').length;
        const needsUpdate = content.filter(c => c.status === 'needs-update').length;
        const missing = Math.max(0, totalRequired - available - inProgress);
        
        return {
          totalRequired,
          available,
          inProgress,
          missing,
          needsUpdate,
          byModule,
          readinessPercent: totalRequired > 0 
            ? Math.round((available / totalRequired) * 100) 
            : 0,
        };
      },
      
      getContentForSection: (ctdSection) => {
        const content = Object.values(get().collectedContent);
        return content.find(c => c.ctdSection === ctdSection);
      },
      
      getMissingRequirements: () => {
        const { requirements, collectedContent } = get();
        const coveredSections = new Set(
          Object.values(collectedContent).map(c => c.ctdSection)
        );
        return requirements.filter(r => r.required && !coveredSections.has(r.ctdSection));
      },
      
      getContentByModule: (module) => {
        return Object.values(get().collectedContent).filter(c => c.module === module);
      },
      
      getContentBySource: (source) => {
        return Object.values(get().collectedContent).filter(c => c.source === source);
      },
      
      // ========================================================================
      // Reset
      // ========================================================================
      
      clear: () => {
        set({
          config: null,
          requirements: [],
          collectedContent: {},
          contentIndex: [],
          isCollecting: false,
          lastCollected: null,
        }, false, 'clear');
      },
    }),
    { name: 'content-collection-store' }
  )
);

// ============================================================================
// HOOKS
// ============================================================================

export function useContentSummary() {
  return useContentCollectionStore(state => state.getSummary());
}

export function useMissingContent() {
  return useContentCollectionStore(state => state.getMissingRequirements());
}

export default useContentCollectionStore;
