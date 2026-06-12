
/**
 * Documents API Client
 * Provides typed fetch wrappers for Document endpoints
 */

import type { Document } from '@/types/core';

// =============================================================================
// TYPES
// =============================================================================

export type DocumentStatus = 'Draft' | 'In Review' | 'Approved' | 'Effective';

export interface DocumentListParams {
  status?: DocumentStatus | 'all';
  productId?: string;
  search?: string;
  sortBy?: 'updatedAt' | 'title' | 'status' | 'version';
  sortDir?: 'asc' | 'desc';
}

export interface DocumentListResponse {
  data: (Document & { productName?: string; content?: string })[];
  total: number;
  stats: {
    total: number;
    byStatus: {
      draft: number;
      inReview: number;
      approved: number;
      effective: number;
    };
  };
}

export interface DocumentResponse {
  data: Document & { 
    productName?: string; 
    content?: string;
    versionHistory?: Array<{
      id: string;
      version: string;
      changeDescription: string;
      createdAt: string;
    }>;
  };
}

export interface CreateDocumentParams {
  title: string;
  productId?: string;
  moduleSection?: string;
  author?: string;
  content?: string;
  status?: DocumentStatus;
  version?: string;
}

export interface UpdateDocumentParams {
  title?: string;
  productId?: string;
  moduleSection?: string;
  author?: string;
  content?: string;
  status?: DocumentStatus;
  version?: string;
  wordCount?: number;
}

// =============================================================================
// API CLIENT
// =============================================================================

class DocumentsApiClient {
  private baseUrl = '/api/documents';
  
  /**
   * Check if database is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?limit=1`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * List documents with filters
   */
  async list(params?: DocumentListParams): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    if (params?.productId && params.productId !== 'all') {
      searchParams.set('productId', params.productId);
    }
    if (params?.search) {
      searchParams.set('search', params.search);
    }
    if (params?.sortBy) {
      searchParams.set('sortBy', params.sortBy);
    }
    if (params?.sortDir) {
      searchParams.set('sortDir', params.sortDir);
    }
    
    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get single document by ID
   */
  async get(id: string): Promise<DocumentResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Document not found');
      }
      throw new Error(`Failed to fetch document: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new document
   */
  async create(data: CreateDocumentParams): Promise<DocumentResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create document: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update document
   */
  async update(id: string, data: UpdateDocumentParams): Promise<DocumentResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Document not found');
      }
      throw new Error(`Failed to update document: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Delete document
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Document not found');
      }
      throw new Error(`Failed to delete document: ${response.status}`);
    }
  }
  
  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================
  
  /**
   * Get documents by product ID
   */
  async getByProduct(productId: string): Promise<DocumentListResponse> {
    return this.list({ productId });
  }
  
  /**
   * Get documents by status
   */
  async getByStatus(status: DocumentStatus): Promise<DocumentListResponse> {
    return this.list({ status });
  }
  
  /**
   * Get draft documents
   */
  async getDrafts(): Promise<DocumentListResponse> {
    return this.list({ status: 'Draft' });
  }
  
  /**
   * Get documents in review
   */
  async getInReview(): Promise<DocumentListResponse> {
    return this.list({ status: 'In Review' });
  }
  
  /**
   * Get approved documents
   */
  async getApproved(): Promise<DocumentListResponse> {
    return this.list({ status: 'Approved' });
  }
  
  /**
   * Update document status
   */
  async updateStatus(id: string, status: DocumentStatus): Promise<DocumentResponse> {
    return this.update(id, { status });
  }
  
  /**
   * Update document content
   */
  async updateContent(id: string, content: string): Promise<DocumentResponse> {
    return this.update(id, { content });
  }
}

// Export singleton instance
export const documentsApi = new DocumentsApiClient();
