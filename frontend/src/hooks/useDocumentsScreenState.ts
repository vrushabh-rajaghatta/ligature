

import { logger } from '@/lib/logger';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { documentsApi, type DocumentStatus, type DocumentListParams } from '@/lib/documents-api';
import { documents as mockDocuments, products } from '@/data/mock';
import type { Document } from '@/types/core';

// =============================================================================
// SYNC STATUS TYPE
// =============================================================================

export type DocumentsSyncStatus = 'idle' | 'loading' | 'synced' | 'error' | 'offline';

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface DocumentsFilters {
  status: DocumentStatus | 'all';
  productId: string;
  searchQuery: string;
  sortBy: 'updatedAt' | 'title' | 'status' | 'version';
  sortDir: 'asc' | 'desc';
}

// =============================================================================
// STATS TYPE
// =============================================================================

export interface DocumentsStats {
  total: number;
  draft: number;
  inReview: number;
  approved: number;
  effective: number;
}

/**
 * Hook that provides Documents screen state with database sync.
 * Following the HAQ/Safety pattern:
 * - Load from database on mount
 * - Fallback to mock data if database unavailable/empty
 * - Persist mutations to database
 * 
 * Phase 1.1g: Documents store database sync
 */
export function useDocumentsScreenState() {
  // =============================================================================
  // DATABASE SYNC STATE
  // =============================================================================
  
  const [syncStatus, setSyncStatus] = useState<DocumentsSyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFromDatabase, setIsFromDatabase] = useState(false);
  const [dbDocuments, setDbDocuments] = useState<Document[]>([]);
  const hasSynced = useRef(false);
  const isSyncing = useRef(false);

  // =============================================================================
  // FILTER STATE
  // =============================================================================
  
  const [filters, setFilters] = useState<DocumentsFilters>({
    status: 'all',
    productId: 'all',
    searchQuery: '',
    sortBy: 'updatedAt',
    sortDir: 'desc',
  });

  // =============================================================================
  // SELECTION STATE
  // =============================================================================
  
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // =============================================================================
  // SYNC FROM DATABASE
  // =============================================================================
  
  const syncFromDatabase = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncStatus('loading');
    setSyncError(null);
    
    try {
      // Check if API is available
      const isAvailable = await documentsApi.isAvailable();
      
      if (!isAvailable) {
        logger.debug('Documents Sync', 'Database not available, using mock data');
        setSyncStatus('offline');
        setIsFromDatabase(false);
        isSyncing.current = false;
        return;
      }
      
      // Fetch documents from database
      const response = await documentsApi.list({
        sortBy: 'updatedAt',
        sortDir: 'desc',
      });
      
      if (response.data && response.data.length > 0) {
        logger.debug('Documents Sync', ` Loaded ${response.data.length} documents from database`);
        // Map API response to Document type (API returns extended fields)
        const documents: Document[] = response.data.map(d => ({
          id: d.id,
          productId: d.productId,
          title: d.title,
          moduleSection: d.moduleSection,
          version: d.version,
          status: d.status,
          lastModified: d.lastModified || new Date().toISOString(),
          author: d.author,
          wordCount: d.wordCount,
        }));
        setDbDocuments(documents);
        setIsFromDatabase(true);
        setSyncStatus('synced');
      } else {
        // Database is available but empty - keep mock data
        logger.debug('Documents Sync', 'Database empty, keeping mock data');
        setSyncStatus('synced');
        setIsFromDatabase(false);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Documents Sync', `Error: ${message}`);
      setSyncError(message);
      setSyncStatus('error');
      setIsFromDatabase(false);
    } finally {
      isSyncing.current = false;
    }
  }, []);
  
  // Sync on mount (once)
  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true;
      syncFromDatabase();
    }
  }, [syncFromDatabase]);

  // =============================================================================
  // DATA SOURCE SELECTION
  // =============================================================================
  
  const allDocuments = useMemo(() => {
    // Use database documents if available, otherwise mock data
    if (isFromDatabase && dbDocuments.length > 0) {
      return dbDocuments;
    }
    return mockDocuments;
  }, [isFromDatabase, dbDocuments]);

  // =============================================================================
  // FILTERED DOCUMENTS
  // =============================================================================
  
  const filteredDocuments = useMemo(() => {
    let filtered = [...allDocuments];
    
    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(d => d.status === filters.status);
    }
    
    // Apply product filter
    if (filters.productId !== 'all') {
      filtered = filtered.filter(d => d.productId === filters.productId);
    }
    
    // Apply search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(query) ||
        d.moduleSection.toLowerCase().includes(query) ||
        d.author.toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'updatedAt':
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status': {
          const statusOrder = { Draft: 0, 'In Review': 1, Approved: 2, Effective: 3 };
          comparison = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
        }
        case 'version':
          comparison = a.version.localeCompare(b.version);
          break;
      }
      return filters.sortDir === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [allDocuments, filters]);

  // =============================================================================
  // STATS
  // =============================================================================
  
  const stats = useMemo((): DocumentsStats => {
    return {
      total: filteredDocuments.length,
      draft: filteredDocuments.filter(d => d.status === 'Draft').length,
      inReview: filteredDocuments.filter(d => d.status === 'In Review').length,
      approved: filteredDocuments.filter(d => d.status === 'Approved').length,
      effective: filteredDocuments.filter(d => d.status === 'Effective').length,
    };
  }, [filteredDocuments]);

  // =============================================================================
  // SELECTED DOCUMENT
  // =============================================================================
  
  const selectedDocument = useMemo(() => {
    return allDocuments.find(d => d.id === selectedDocumentId) || null;
  }, [allDocuments, selectedDocumentId]);

  // =============================================================================
  // PRODUCT OPTIONS
  // =============================================================================
  
  const productOptions = useMemo(() => {
    const productIds = new Set(allDocuments.map(d => d.productId));
    return products.filter(p => productIds.has(p.id));
  }, [allDocuments]);

  // =============================================================================
  // FILTER SETTERS
  // =============================================================================
  
  const setFilterStatus = useCallback((status: DocumentStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }));
  }, []);
  
  const setFilterProduct = useCallback((productId: string) => {
    setFilters(prev => ({ ...prev, productId }));
  }, []);
  
  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, []);
  
  const setSortBy = useCallback((sortBy: DocumentsFilters['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);
  
  const setSortDir = useCallback((sortDir: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortDir }));
  }, []);
  
  const toggleSortDirection = useCallback(() => {
    setFilters(prev => ({ ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc' }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      productId: 'all',
      searchQuery: '',
      sortBy: 'updatedAt',
      sortDir: 'desc',
    });
  }, []);

  // =============================================================================
  // SELECTION
  // =============================================================================
  
  const selectDocument = useCallback((id: string | null) => {
    setSelectedDocumentId(id);
  }, []);

  // =============================================================================
  // WRAPPED MUTATIONS (Persist to database)
  // =============================================================================
  
  /**
   * Update document status - updates local state AND persists to database
   */
  const updateDocumentStatus = useCallback(async (documentId: string, status: DocumentStatus) => {
    // 1. Update local state immediately (optimistic)
    if (isFromDatabase) {
      setDbDocuments(prev => prev.map(d =>
        d.id === documentId ? { ...d, status, lastModified: new Date().toISOString() } : d
      ));
    }
    
    // 2. Persist to database
    if (isFromDatabase) {
      try {
        await documentsApi.updateStatus(documentId, status);
        logger.debug('Documents Sync', ` Persisted status change: ${documentId} → ${status}`);
      } catch (err) {
        logger.error('Documents Sync', 'Failed to persist status change', err);
        // Note: We don't revert the local change - the UI stays updated (offline-first)
      }
    }
  }, [isFromDatabase]);

  /**
   * Update document content - updates local state AND persists to database
   */
  const updateDocumentContent = useCallback(async (documentId: string, content: string) => {
    if (isFromDatabase) {
      try {
        await documentsApi.updateContent(documentId, content);
        logger.debug('Documents Sync', ` Persisted content change: ${documentId}`);
      } catch (err) {
        logger.error('Documents Sync', 'Failed to persist content change', err);
      }
    }
  }, [isFromDatabase]);

  /**
   * Create a new document
   */
  const createDocument = useCallback(async (data: {
    title: string;
    productId: string;
    moduleSection?: string;
    author?: string;
    content?: string;
    status?: DocumentStatus;
  }) => {
    try {
      const response = await documentsApi.create(data);
      logger.debug('Documents Sync', ` Created document: ${response.data.id}`);
      
      // Add to local state if synced from database
      if (isFromDatabase) {
        const newDoc: Document = {
          id: response.data.id,
          productId: response.data.productId,
          title: response.data.title,
          moduleSection: response.data.moduleSection,
          version: response.data.version,
          status: response.data.status,
          lastModified: response.data.lastModified || new Date().toISOString(),
          author: response.data.author,
          wordCount: response.data.wordCount,
        };
        setDbDocuments(prev => [newDoc, ...prev]);
      }
      
      return response.data;
    } catch (err) {
      logger.error('Documents Sync', 'Failed to create document', err);
      throw err;
    }
  }, [isFromDatabase]);

  /**
   * Delete a document
   */
  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      await documentsApi.delete(documentId);
      logger.debug('Documents Sync', ` Deleted document: ${documentId}`);
      
      // Remove from local state if synced from database
      if (isFromDatabase) {
        setDbDocuments(prev => prev.filter(d => d.id !== documentId));
      }
      
      // Clear selection if deleted document was selected
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(null);
      }
    } catch (err) {
      logger.error('Documents Sync', 'Failed to delete document', err);
      throw err;
    }
  }, [isFromDatabase, selectedDocumentId]);

  // =============================================================================
  // RETURN
  // =============================================================================
  
  return useMemo(() => ({
    // Data
    documents: filteredDocuments,
    allDocuments,
    selectedDocument,
    stats,
    
    // Options
    productOptions,
    
    // Selection
    selectedDocumentId,
    selectDocument,
    
    // Filters
    filters,
    setFilterStatus,
    setFilterProduct,
    setSearchQuery,
    setSortBy,
    setSortDir,
    toggleSortDirection,
    clearFilters,
    
    // Actions (wrapped with persistence)
    updateDocumentStatus,
    updateDocumentContent,
    createDocument,
    deleteDocument,
    
    // Legacy mock data access
    mockDocuments,
    
    // Sync status
    syncStatus,
    syncError,
    isFromDatabase,
    resync: syncFromDatabase,
  }), [
    filteredDocuments,
    allDocuments,
    selectedDocument,
    stats,
    productOptions,
    selectedDocumentId,
    selectDocument,
    filters,
    setFilterStatus,
    setFilterProduct,
    setSearchQuery,
    setSortBy,
    setSortDir,
    toggleSortDirection,
    clearFilters,
    updateDocumentStatus,
    updateDocumentContent,
    createDocument,
    deleteDocument,
    syncStatus,
    syncError,
    isFromDatabase,
    syncFromDatabase,
  ]);
}
