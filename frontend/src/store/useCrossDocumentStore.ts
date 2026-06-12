

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// CROSS-DOCUMENT CONTENT LINKING
// ============================================================================
// Tracks relationships between content across documents
// When source content changes, dependent content is flagged for review

export type LinkType = 
  | 'derived-from'      // Content was derived/summarized from source
  | 'references'        // Content references source
  | 'duplicates'        // Content is duplicate of source (should stay in sync)
  | 'supersedes'        // Content supersedes older version
  | 'related-to';       // General relationship

export interface ContentLink {
  id: string;
  
  // Source (where content originated)
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  sourceSectionId?: string;
  sourceSectionNumber?: string;
  sourceContentHash: string; // For change detection
  
  // Target (where content is used)
  targetDocumentId: string;
  targetDocumentTitle: string;
  targetSectionId: string;
  targetSectionNumber: string;
  
  // Relationship
  linkType: LinkType;
  description?: string;
  
  // Status
  status: 'current' | 'source-updated' | 'review-needed' | 'acknowledged';
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  lastChecked: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface ContentUpdate {
  id: string;
  linkId: string;
  
  // What changed
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  sourceSectionId?: string;
  sourceSectionNumber?: string;
  
  // Change details
  changeType: 'content-modified' | 'content-deleted' | 'section-restructured';
  changeSummary: string;
  previousHash: string;
  newHash: string;
  
  // When
  detectedAt: Date;
  
  // Status
  status: 'pending' | 'reviewed' | 'propagated' | 'dismissed';
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

// ============================================================================
// STORE
// ============================================================================

interface CrossDocumentState {
  // All content links
  links: ContentLink[];
  
  // Pending updates to review
  pendingUpdates: ContentUpdate[];
  
  // Link management
  createLink: (link: Omit<ContentLink, 'id' | 'createdAt' | 'lastChecked' | 'status'>) => string;
  removeLink: (linkId: string) => void;
  updateLinkStatus: (linkId: string, status: ContentLink['status']) => void;
  
  // Update detection
  detectSourceChange: (
    sourceDocumentId: string,
    sourceSectionId: string | undefined,
    newContentHash: string,
    changeSummary: string
  ) => ContentUpdate[];
  
  // Update handling
  acknowledgeUpdate: (updateId: string, userId: string, notes?: string) => void;
  dismissUpdate: (updateId: string, userId: string, reason: string) => void;
  propagateUpdate: (updateId: string, userId: string) => void;
  
  // Queries
  getLinksForDocument: (documentId: string) => ContentLink[];
  getLinksForSection: (sectionId: string) => ContentLink[];
  getInboundLinks: (documentId: string) => ContentLink[];  // Links TO this document
  getOutboundLinks: (documentId: string) => ContentLink[]; // Links FROM this document
  getPendingUpdatesForDocument: (documentId: string) => ContentUpdate[];
  
  // Analysis
  getImpactAnalysis: (sourceDocumentId: string, sourceSectionId?: string) => {
    affectedDocuments: string[];
    affectedSections: { documentId: string; sectionId: string; sectionNumber: string }[];
    linkCount: number;
  };
  
  // Clear (for testing)
  clearAll: () => void;
}

const generateId = () => `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateUpdateId = () => `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Simple hash function for content change detection
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export const useCrossDocumentStore = create<CrossDocumentState>()(
  devtools(
    (set, get) => ({
      links: [],
      pendingUpdates: [],
      
      createLink: (link) => {
        const id = generateId();
        const fullLink: ContentLink = {
          ...link,
          id,
          status: 'current',
          createdAt: new Date(),
          lastChecked: new Date(),
        };
        
        set((state) => ({
          links: [...state.links, fullLink],
        }), false, 'createLink');
        
        return id;
      },
      
      removeLink: (linkId) => {
        set((state) => ({
          links: state.links.filter(l => l.id !== linkId),
          pendingUpdates: state.pendingUpdates.filter(u => u.linkId !== linkId),
        }), false, 'removeLink');
      },
      
      updateLinkStatus: (linkId, status) => {
        set((state) => ({
          links: state.links.map(l => 
            l.id === linkId 
              ? { ...l, status, lastChecked: new Date() }
              : l
          ),
        }), false, 'updateLinkStatus');
      },
      
      detectSourceChange: (sourceDocumentId, sourceSectionId, newContentHash, changeSummary) => {
        const state = get();
        const newUpdates: ContentUpdate[] = [];
        
        // Find all links that reference this source
        const affectedLinks = state.links.filter(l => 
          l.sourceDocumentId === sourceDocumentId &&
          (!sourceSectionId || l.sourceSectionId === sourceSectionId) &&
          l.sourceContentHash !== newContentHash
        );
        
        for (const link of affectedLinks) {
          const update: ContentUpdate = {
            id: generateUpdateId(),
            linkId: link.id,
            sourceDocumentId: link.sourceDocumentId,
            sourceDocumentTitle: link.sourceDocumentTitle,
            sourceSectionId: link.sourceSectionId,
            sourceSectionNumber: link.sourceSectionNumber,
            changeType: 'content-modified',
            changeSummary,
            previousHash: link.sourceContentHash,
            newHash: newContentHash,
            detectedAt: new Date(),
            status: 'pending',
          };
          
          newUpdates.push(update);
        }
        
        if (newUpdates.length > 0) {
          set((state) => ({
            pendingUpdates: [...state.pendingUpdates, ...newUpdates],
            links: state.links.map(l => {
              const isAffected = affectedLinks.some(al => al.id === l.id);
              return isAffected 
                ? { ...l, status: 'source-updated' as const, sourceContentHash: newContentHash }
                : l;
            }),
          }), false, 'detectSourceChange');
        }
        
        return newUpdates;
      },
      
      acknowledgeUpdate: (updateId, userId, notes) => {
        set((state) => ({
          pendingUpdates: state.pendingUpdates.map(u =>
            u.id === updateId
              ? { ...u, status: 'reviewed' as const, reviewedAt: new Date(), reviewedBy: userId, reviewNotes: notes }
              : u
          ),
          links: state.links.map(l => {
            const update = state.pendingUpdates.find(u => u.id === updateId);
            if (update && l.id === update.linkId) {
              return { ...l, status: 'acknowledged' as const, acknowledgedAt: new Date(), acknowledgedBy: userId };
            }
            return l;
          }),
        }), false, 'acknowledgeUpdate');
      },
      
      dismissUpdate: (updateId, userId, reason) => {
        set((state) => ({
          pendingUpdates: state.pendingUpdates.map(u =>
            u.id === updateId
              ? { ...u, status: 'dismissed' as const, reviewedAt: new Date(), reviewedBy: userId, reviewNotes: reason }
              : u
          ),
          links: state.links.map(l => {
            const update = state.pendingUpdates.find(u => u.id === updateId);
            if (update && l.id === update.linkId) {
              return { ...l, status: 'current' as const };
            }
            return l;
          }),
        }), false, 'dismissUpdate');
      },
      
      propagateUpdate: (updateId, userId) => {
        set((state) => ({
          pendingUpdates: state.pendingUpdates.map(u =>
            u.id === updateId
              ? { ...u, status: 'propagated' as const, reviewedAt: new Date(), reviewedBy: userId }
              : u
          ),
          links: state.links.map(l => {
            const update = state.pendingUpdates.find(u => u.id === updateId);
            if (update && l.id === update.linkId) {
              return { ...l, status: 'current' as const };
            }
            return l;
          }),
        }), false, 'propagateUpdate');
      },
      
      getLinksForDocument: (documentId) => {
        return get().links.filter(l => 
          l.sourceDocumentId === documentId || l.targetDocumentId === documentId
        );
      },
      
      getLinksForSection: (sectionId) => {
        return get().links.filter(l => 
          l.sourceSectionId === sectionId || l.targetSectionId === sectionId
        );
      },
      
      getInboundLinks: (documentId) => {
        return get().links.filter(l => l.targetDocumentId === documentId);
      },
      
      getOutboundLinks: (documentId) => {
        return get().links.filter(l => l.sourceDocumentId === documentId);
      },
      
      getPendingUpdatesForDocument: (documentId) => {
        const links = get().getLinksForDocument(documentId);
        const linkIds = new Set(links.map(l => l.id));
        return get().pendingUpdates.filter(u => 
          linkIds.has(u.linkId) && u.status === 'pending'
        );
      },
      
      getImpactAnalysis: (sourceDocumentId, sourceSectionId) => {
        const links = get().links.filter(l =>
          l.sourceDocumentId === sourceDocumentId &&
          (!sourceSectionId || l.sourceSectionId === sourceSectionId)
        );
        
        const affectedDocuments = Array.from(new Set(links.map(l => l.targetDocumentId)));
        const affectedSections = links.map(l => ({
          documentId: l.targetDocumentId,
          sectionId: l.targetSectionId,
          sectionNumber: l.targetSectionNumber,
        }));
        
        return {
          affectedDocuments,
          affectedSections,
          linkCount: links.length,
        };
      },
      
      clearAll: () => set({ links: [], pendingUpdates: [] }, false, 'clearAll'),
    }),
    { name: 'CrossDocumentStore' }
  )
);

// ============================================================================
// HELPER: Content Hash Utility
// ============================================================================

export { hashContent };

// ============================================================================
// EXAMPLE USAGE
// ============================================================================
/*
// Create a link when content is derived from another document
const linkId = useCrossDocumentStore.getState().createLink({
  sourceDocumentId: 'csr-001',
  sourceDocumentTitle: 'Clinical Study Report LIG-301',
  sourceSectionId: 'sec-11',
  sourceSectionNumber: '11',
  sourceContentHash: hashContent(csrEfficacyContent),
  targetDocumentId: 'module-25-001',
  targetDocumentTitle: 'Clinical Overview (M2.5)',
  targetSectionId: 'sec-2.5.4',
  targetSectionNumber: '2.5.4',
  linkType: 'derived-from',
  description: 'Efficacy overview derived from CSR Section 11',
  createdBy: 'user-1',
});

// Later, when CSR is updated:
const updates = useCrossDocumentStore.getState().detectSourceChange(
  'csr-001',
  'sec-11',
  hashContent(updatedCsrContent),
  'Updated primary endpoint analysis with final data'
);

// User reviews and acknowledges:
useCrossDocumentStore.getState().acknowledgeUpdate(
  updates[0].id,
  'user-1',
  'Reviewed and updated M2.5 to reflect new HR value'
);
*/
