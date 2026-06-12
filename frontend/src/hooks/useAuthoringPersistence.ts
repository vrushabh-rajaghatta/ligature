
/**
 * useAuthoringPersistence Hook
 * Connects useAuthoringStore to Supabase persistence layer
 * 
 * v0.41.0 - Authoring Persistence
 */

import { useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type DocumentType = 'protocol' | 'ib' | 'csr' | 'icf' | 'dsur' | 'pbrer' | 'sap' | 'other';
type DocumentStatus = 'not-started' | 'drafting' | 'internal-review' | 'qc-review' | 'approved' | 'submission-ready';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface AuthoringDocument {
  id: string;
  documentType: DocumentType;
  title: string;
  shortTitle: string | null;
  version: string;
  versionDate: string;
  ctdSection: string | null;
  ctdModule: string | null;
  programId: string | null;
  programName: string | null;
  productId: string | null;
  productName: string | null;
  studyId: string | null;
  studyName: string | null;
  indication: string | null;
  templateId: string | null;
  templateName: string | null;
  status: DocumentStatus;
  workflowId: string | null;
  dueDate: string | null;
  targetDate: string | null;
  authorId: string | null;
  authorName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  progress: number;
  sectionsTotal: number;
  sectionsComplete: number;
  openComments: number;
  totalComments: number;
  tags: string[];
  priority: Priority;
  prerequisitesMet: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DocumentFilters {
  documentType?: DocumentType;
  status?: DocumentStatus;
  studyId?: string;
  productId?: string;
  authorId?: string;
  priority?: Priority;
  search?: string;
}

interface DocumentStats {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalDrafting: number;
  totalInReview: number;
  totalApproved: number;
}

interface CreateDocumentData {
  documentType: DocumentType;
  title: string;
  shortTitle?: string;
  version?: string;
  studyId?: string;
  studyName?: string;
  productId?: string;
  productName?: string;
  programId?: string;
  programName?: string;
  indication?: string;
  templateId?: string;
  templateName?: string;
  ctdSection?: string;
  ctdModule?: string;
  authorId?: string;
  authorName?: string;
  ownerId?: string;
  ownerName?: string;
  dueDate?: string;
  targetDate?: string;
  priority?: Priority;
  tags?: string[];
  workflowId?: string;
}

interface UpdateDocumentData {
  title?: string;
  shortTitle?: string;
  version?: string;
  status?: DocumentStatus;
  progress?: number;
  dueDate?: string | null;
  targetDate?: string | null;
  authorId?: string;
  authorName?: string;
  ownerId?: string;
  ownerName?: string;
  priority?: Priority;
  tags?: string[];
  prerequisitesMet?: boolean;
  currentReviewStage?: string;
  workflowId?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  approvedDate?: string;
  userId?: string;
  userName?: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAuthoringPersistence() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'mock' | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch Documents
  // ---------------------------------------------------------------------------
  
  const fetchDocuments = useCallback(async (filters?: DocumentFilters): Promise<{
    data: AuthoringDocument[];
    total: number;
    stats: DocumentStats;
  } | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.documentType) params.append('documentType', filters.documentType);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.studyId) params.append('studyId', filters.studyId);
      if (filters?.productId) params.append('productId', filters.productId);
      if (filters?.authorId) params.append('authorId', filters.authorId);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.search) params.append('search', filters.search);
      
      const response = await fetch(`/api/authoring/documents?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      setLastSyncedAt(new Date());
      
      return {
        data: result.data,
        total: result.total,
        stats: result.stats,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(message);
      console.error('useAuthoringPersistence.fetchDocuments error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch Single Document
  // ---------------------------------------------------------------------------
  
  const fetchDocument = useCallback(async (id: string): Promise<AuthoringDocument | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/authoring/documents/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch document';
      setError(message);
      console.error('useAuthoringPersistence.fetchDocument error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Create Document
  // ---------------------------------------------------------------------------
  
  const createDocument = useCallback(async (data: CreateDocumentData): Promise<AuthoringDocument | null> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/authoring/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      setLastSyncedAt(new Date());
      
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create document';
      setError(message);
      console.error('useAuthoringPersistence.createDocument error:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Update Document
  // ---------------------------------------------------------------------------
  
  const updateDocument = useCallback(async (
    id: string, 
    updates: UpdateDocumentData
  ): Promise<AuthoringDocument | null> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/authoring/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      setSource(result.source);
      setLastSyncedAt(new Date());
      
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update document';
      setError(message);
      console.error('useAuthoringPersistence.updateDocument error:', err);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Delete Document
  // ---------------------------------------------------------------------------
  
  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/authoring/documents/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      setLastSyncedAt(new Date());
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      setError(message);
      console.error('useAuthoringPersistence.deleteDocument error:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Update Document Status
  // ---------------------------------------------------------------------------
  
  const updateDocumentStatus = useCallback(async (
    id: string,
    status: DocumentStatus,
    userId?: string,
    userName?: string
  ): Promise<AuthoringDocument | null> => {
    return updateDocument(id, { status, userId, userName });
  }, [updateDocument]);

  // ---------------------------------------------------------------------------
  // Finalize Document
  // ---------------------------------------------------------------------------
  
  const finalizeDocument = useCallback(async (
    id: string,
    userId: string,
    userName: string
  ): Promise<AuthoringDocument | null> => {
    const now = new Date().toISOString();
    return updateDocument(id, {
      status: 'approved',
      finalizedAt: now,
      finalizedBy: userName,
      approvedDate: now.split('T')[0],
      userId,
      userName,
    });
  }, [updateDocument]);

  // ---------------------------------------------------------------------------
  // Sync Store to Database
  // ---------------------------------------------------------------------------
  
  const syncToDatabase = useCallback(async (documents: AuthoringDocument[]): Promise<boolean> => {
    setIsSyncing(true);
    setError(null);
    
    try {
      // For now, just update each document
      // In production, this would be a batch operation
      for (const doc of documents) {
        await updateDocument(doc.id, {
          title: doc.title,
          status: doc.status,
          progress: doc.progress,
          priority: doc.priority,
        });
      }
      
      setLastSyncedAt(new Date());
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync to database';
      setError(message);
      console.error('useAuthoringPersistence.syncToDatabase error:', err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [updateDocument]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  
  return {
    // State
    isLoading,
    isSyncing,
    lastSyncedAt,
    error,
    source,
    
    // Document CRUD
    fetchDocuments,
    fetchDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    
    // Status management
    updateDocumentStatus,
    finalizeDocument,
    
    // Sync
    syncToDatabase,
  };
}

export default useAuthoringPersistence;
