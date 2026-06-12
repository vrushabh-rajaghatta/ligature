
/**
 * Document Control Persistence Hook
 * Connects useDocumentControlStore to Supabase via API routes
 * 
 * v0.40.6 - Document Control Persistence
 */

import { useCallback, useState } from 'react';
import { useDocumentControlStore } from '@/store/useDocumentControlStore';

// =============================================================================
// TYPES
// =============================================================================

interface PersistenceState {
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  source: 'database' | 'mock' | null;
}

interface ReviewCycleFilters {
  documentId?: string;
  status?: string;
  reviewerId?: string;
}

interface WorkflowFilters {
  status?: string;
  category?: string;
  documentType?: string;
}

interface ArchiveFilters {
  status?: string;
  retentionCategory?: string;
  legalHoldId?: string;
  search?: string;
}

interface TemplateFilters {
  category?: string;
  status?: string;
  documentType?: string;
  search?: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useDocumentControlPersistence() {
  const store = useDocumentControlStore();
  const [state, setState] = useState<PersistenceState>({
    isLoading: false,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    source: null,
  });

  // ---------------------------------------------------------------------------
  // REVIEW CYCLES
  // ---------------------------------------------------------------------------

  const fetchReviewCycles = useCallback(async (filters?: ReviewCycleFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (filters?.documentId) params.append('documentId', filters.documentId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.reviewerId) params.append('reviewerId', filters.reviewerId);
      
      const res = await fetch(`/api/document-control/review-cycles?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch review cycles');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return {
        reviewCycles: json.data,
        total: json.total,
        stats: json.stats,
        source: json.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const createReviewCycle = useCallback(async (data: {
    documentId: string;
    documentTitle?: string;
    reviewType?: string;
    reviewers: Array<{
      userId: string;
      userName: string;
      email?: string;
      role?: string;
      dueDate?: string;
    }>;
    dueDate?: string;
    initiatedBy?: string;
    initiatedByName?: string;
  }) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch('/api/document-control/review-cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create review cycle');
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // WORKFLOWS
  // ---------------------------------------------------------------------------

  const fetchWorkflows = useCallback(async (filters?: WorkflowFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.documentType) params.append('documentType', filters.documentType);
      
      const res = await fetch(`/api/document-control/workflows?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch workflows');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return {
        workflows: json.data,
        total: json.total,
        stats: json.stats,
        source: json.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const createWorkflow = useCallback(async (data: {
    name: string;
    description?: string;
    category?: string;
    steps: Array<{
      name: string;
      type: string;
      assigneeType?: string;
      assigneeId?: string;
      assigneeName?: string;
      timeoutHours?: number;
      isRequired?: boolean;
      actions?: Array<{ type: string; label: string; nextStepId?: string; requiresComment?: boolean }>;
    }>;
    documentTypes?: string[];
    slaHours?: number;
    escalationPolicy?: string;
    createdBy?: string;
    createdByName?: string;
  }) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch('/api/document-control/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create workflow');
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // TEMPLATES
  // ---------------------------------------------------------------------------

  const fetchTemplates = useCallback(async (filters?: TemplateFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.documentType) params.append('documentType', filters.documentType);
      if (filters?.search) params.append('search', filters.search);
      
      const res = await fetch(`/api/document-control/templates?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch templates');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return {
        templates: json.data,
        total: json.total,
        stats: json.stats,
        source: json.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const createTemplate = useCallback(async (data: {
    name: string;
    category: string;
    documentType: string;
    templateId?: string;
    description?: string;
    sections?: Array<{
      name: string;
      description?: string;
      isRequired?: boolean;
      defaultContent?: string;
      placeholders?: string[];
      guidance?: string;
    }>;
    defaultMetadata?: Record<string, string>;
    requiredFields?: string[];
    outputFormat?: string;
    reviewWorkflowId?: string;
    approvalRequired?: boolean;
    retentionCategory?: string;
    retentionYears?: number;
    createdBy?: string;
    createdByName?: string;
  }) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch('/api/document-control/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create template');
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // ARCHIVES
  // ---------------------------------------------------------------------------

  const fetchArchives = useCallback(async (filters?: ArchiveFilters) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.retentionCategory) params.append('retentionCategory', filters.retentionCategory);
      if (filters?.legalHoldId) params.append('legalHoldId', filters.legalHoldId);
      if (filters?.search) params.append('search', filters.search);
      
      const res = await fetch(`/api/document-control/archives?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch archives');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return {
        archives: json.data,
        legalHolds: json.legalHolds,
        total: json.total,
        stats: json.stats,
        source: json.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const archiveDocument = useCallback(async (data: {
    documentId: string;
    documentNumber?: string;
    documentTitle?: string;
    retentionCategory: string;
    retentionPeriodYears?: number;
    archiveReason?: string;
    archiveLocation?: string;
    archivedBy?: string;
    archivedByName?: string;
    legalHoldId?: string;
    legalHoldReason?: string;
    checksum?: string;
    fileSize?: number;
  }) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch('/api/document-control/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to archive document');
      
      // Update local store
      store.updateDocument(data.documentId, { archiveStatus: 'archived' } as any);
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source,
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, [store]);

  // ---------------------------------------------------------------------------
  // DOCUMENTS (via existing /api/documents)
  // ---------------------------------------------------------------------------

  const fetchDocuments = useCallback(async (filters?: {
    status?: string;
    type?: string;
    productId?: string;
    search?: string;
  }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.productId) params.append('productId', filters.productId);
      if (filters?.search) params.append('search', filters.search);
      
      const res = await fetch(`/api/documents?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to fetch documents');
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        source: json.source || 'database',
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return {
        documents: json.data,
        total: json.total,
        source: json.source,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const createDocument = useCallback(async (data: {
    title: string;
    type?: string;
    status?: string;
    version?: string;
    productId?: string;
    ownerId?: string;
    ectdModule?: string;
    ectdSection?: string;
  }) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create document');
      
      // Also create in local store
      store.createDocument({
        title: data.title,
        category: 'regulatory',
        ...data,
      } as any);
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source || 'database',
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, [store]);

  const updateDocument = useCallback(async (id: string, updates: {
    title?: string;
    status?: string;
    version?: string;
    ectdModule?: string;
    ectdSection?: string;
  }) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update document');
      
      // Also update local store
      store.updateDocument(id, updates as any);
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        source: json.source || 'database',
        lastSyncedAt: new Date().toISOString(),
      }));
      
      return json.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, isSyncing: false, error: message }));
      throw error;
    }
  }, [store]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // State
    ...state,
    
    // Documents
    fetchDocuments,
    createDocument,
    updateDocument,
    
    // Review Cycles
    fetchReviewCycles,
    createReviewCycle,
    
    // Workflows
    fetchWorkflows,
    createWorkflow,
    
    // Templates
    fetchTemplates,
    createTemplate,
    
    // Archives
    fetchArchives,
    archiveDocument,
  };
}
