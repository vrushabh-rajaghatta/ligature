
/**
 * Products API Client
 * Provides typed fetch wrappers for Product endpoints
 */

import type { Product, TherapeuticArea, Modality, Stage } from '@/types/core';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductWithCounts extends Product {
  studyCount?: number;
  applicationCount?: number;
  documentCount?: number;
  haqCount?: number;
  submissionCount?: number;
}

export interface ProductListParams {
  therapeuticArea?: TherapeuticArea | 'all';
  stage?: Stage | 'all';
  modality?: Modality | 'all';
  search?: string;
  sortBy?: 'name' | 'code' | 'stage' | 'therapeuticArea';
  sortDir?: 'asc' | 'desc';
  includeCounts?: boolean;
}

export interface ProductListResponse {
  data: ProductWithCounts[];
  total: number;
  stats: {
    total: number;
    byTherapeuticArea: Record<string, number>;
    byStage: Record<string, number>;
    byModality: Record<string, number>;
  };
}

export interface ProductResponse {
  data: ProductWithCounts & {
    recentStudies?: Array<{
      id: string;
      protocolNumber: string;
      title: string;
      phase: string;
      status: string;
    }>;
    recentApplications?: Array<{
      id: string;
      applicationNumber: string;
      type: string;
      region: string;
      status: string;
    }>;
  };
}

export interface CreateProductParams {
  name: string;
  brandName?: string;
  genericName?: string;
  therapeuticArea?: TherapeuticArea;
  modality?: Modality;
  stage?: Stage;
  indication?: string;
}

export interface UpdateProductParams {
  name?: string;
  brandName?: string;
  genericName?: string;
  therapeuticArea?: TherapeuticArea;
  modality?: Modality;
  stage?: Stage;
  indication?: string;
}

// =============================================================================
// API CLIENT
// =============================================================================

class ProductsApiClient {
  private baseUrl = '/api/products';
  
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
   * List products with filters
   */
  async list(params?: ProductListParams): Promise<ProductListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.therapeuticArea && params.therapeuticArea !== 'all') {
      searchParams.set('therapeuticArea', params.therapeuticArea);
    }
    if (params?.stage && params.stage !== 'all') {
      searchParams.set('stage', params.stage);
    }
    if (params?.modality && params.modality !== 'all') {
      searchParams.set('modality', params.modality);
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
    if (params?.includeCounts) {
      searchParams.set('includeCounts', 'true');
    }
    
    const url = `${this.baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get single product by ID
   */
  async get(id: string): Promise<ProductResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error(`Failed to fetch product: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Create new product
   */
  async create(data: CreateProductParams): Promise<ProductResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create product: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Update product
   */
  async update(id: string, data: UpdateProductParams): Promise<ProductResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error(`Failed to update product: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Delete product
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Product not found');
      }
      throw new Error(`Failed to delete product: ${response.status}`);
    }
  }
  
  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================
  
  /**
   * Get products by therapeutic area
   */
  async getByTherapeuticArea(area: TherapeuticArea): Promise<ProductListResponse> {
    return this.list({ therapeuticArea: area });
  }
  
  /**
   * Get products by stage
   */
  async getByStage(stage: Stage): Promise<ProductListResponse> {
    return this.list({ stage });
  }
  
  /**
   * Get products by modality
   */
  async getByModality(modality: Modality): Promise<ProductListResponse> {
    return this.list({ modality });
  }
  
  /**
   * Get products with counts
   */
  async listWithCounts(params?: Omit<ProductListParams, 'includeCounts'>): Promise<ProductListResponse> {
    return this.list({ ...params, includeCounts: true });
  }
  
  /**
   * Update product stage
   */
  async updateStage(id: string, stage: Stage): Promise<ProductResponse> {
    return this.update(id, { stage });
  }
  
  /**
   * Search products
   */
  async search(query: string): Promise<ProductListResponse> {
    return this.list({ search: query });
  }
}

// Export singleton instance
export const productsApi = new ProductsApiClient();
