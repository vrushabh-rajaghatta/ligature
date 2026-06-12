
/**
 * Products Store
 * Manages pharmaceutical products with API sync
 * 
 * @version 0.33.14
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { products as mockProducts } from '@/data/mock';
import type { Product } from '@/types/core';

// =============================================================================
// TYPES
// =============================================================================

interface ProductsState {
  products: Product[];
  selectedProductId: string | null;
  isLoading: boolean;
  lastSynced: string | null;
  syncError: string | null;
  dataSource: 'local' | 'api' | 'unknown';
  
  // Async API actions
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  createProductAsync: (product: Omit<Product, 'id'>) => Promise<string>;
  updateProductAsync: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProductAsync: (id: string) => Promise<void>;
  
  // Local actions
  getProduct: (id: string) => Product | undefined;
  getProductByName: (name: string) => Product | undefined;
  selectProduct: (id: string | null) => void;
  getProductsByTherapeuticArea: (area: string) => Product[];
  getProductsByStage: (stage: string) => Product[];
}

interface ProductFilters {
  therapeuticArea?: string;
  stage?: string;
  status?: string;
  search?: string;
}

// =============================================================================
// API RESPONSE MAPPERS
// =============================================================================

const mapApiToProduct = (api: Record<string, unknown>): Product => ({
  id: api.id as string,
  name: api.name as string || api.code as string,
  brandName: api.brandName as string | undefined,
  genericName: api.genericName as string | undefined,
  therapeuticArea: (api.therapeuticArea as Product['therapeuticArea']) || 'Oncology',
  modality: (api.modality as Product['modality']) || 'Small Molecule',
  stage: (api.phase as Product['stage']) || (api.status as Product['stage']) || 'Preclinical',
  indication: api.indication as string || '',
});

// =============================================================================
// STORE
// =============================================================================

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      products: mockProducts,
      selectedProductId: null,
      isLoading: false,
      lastSynced: null,
      syncError: null,
      dataSource: 'local',

      // =========================================================================
      // ASYNC API ACTIONS
      // =========================================================================

      fetchProducts: async (filters) => {
        set({ isLoading: true, syncError: null });
        try {
          const params = new URLSearchParams();
          if (filters?.therapeuticArea) params.set('therapeuticArea', filters.therapeuticArea);
          if (filters?.stage) params.set('phase', filters.stage);
          if (filters?.status) params.set('status', filters.status);
          if (filters?.search) params.set('search', filters.search);

          const response = await fetch(`/api/products?${params.toString()}`);
          if (!response.ok) throw new Error('Failed to fetch products');

          const result = await response.json();

          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            const apiProducts = result.data.map(mapApiToProduct);
            set({
              products: apiProducts,
              dataSource: 'api',
              lastSynced: new Date().toISOString(),
              isLoading: false,
            });
          } else {
            // Keep mock data if API returns empty
            set({
              dataSource: 'local',
              lastSynced: new Date().toISOString(),
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('[ProductsStore] Fetch error:', error);
          set({ 
            syncError: (error as Error).message, 
            isLoading: false,
            dataSource: 'local',
          });
        }
      },

      createProductAsync: async (productData) => {
        const localId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Optimistic update
        const newProduct: Product = {
          ...productData,
          id: localId,
        };
        set((s) => ({ products: [...s.products, newProduct] }));

        try {
          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: productData.name,
              code: productData.name,
              brandName: productData.brandName,
              genericName: productData.genericName,
              therapeuticArea: productData.therapeuticArea,
              indication: productData.indication,
              phase: productData.stage,
            }),
          });

          if (!response.ok) throw new Error('Failed to create product');

          const result = await response.json();

          if (result.data?.id && result.data.id !== localId) {
            set((s) => ({
              products: s.products.map((p) =>
                p.id === localId ? { ...p, id: result.data.id } : p
              ),
            }));
            return result.data.id;
          }

          set({ lastSynced: new Date().toISOString() });
          return localId;
        } catch (error) {
          console.error('[ProductsStore] Create error:', error);
          set({ syncError: (error as Error).message });
          return localId;
        }
      },

      updateProductAsync: async (id, updates) => {
        // Optimistic update
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));

        try {
          const response = await fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          });

          if (!response.ok) throw new Error('Failed to update product');
          set({ lastSynced: new Date().toISOString() });
        } catch (error) {
          console.error('[ProductsStore] Update error:', error);
          set({ syncError: (error as Error).message });
        }
      },

      deleteProductAsync: async (id) => {
        // Optimistic update
        const removed = get().products.find((p) => p.id === id);
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
          selectedProductId: s.selectedProductId === id ? null : s.selectedProductId,
        }));

        try {
          const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            // Rollback
            if (removed) {
              set((s) => ({ products: [...s.products, removed] }));
            }
            throw new Error('Failed to delete product');
          }
          set({ lastSynced: new Date().toISOString() });
        } catch (error) {
          console.error('[ProductsStore] Delete error:', error);
          set({ syncError: (error as Error).message });
        }
      },

      // =========================================================================
      // LOCAL ACTIONS
      // =========================================================================

      getProduct: (id) => get().products.find((p) => p.id === id),
      
      getProductByName: (name) => get().products.find(
        (p) => p.name === name || p.brandName === name || p.genericName === name
      ),
      
      selectProduct: (id) => set({ selectedProductId: id }),
      
      getProductsByTherapeuticArea: (area) => 
        get().products.filter((p) => p.therapeuticArea === area),
      
      getProductsByStage: (stage) => 
        get().products.filter((p) => p.stage === stage),
    }),
    {
      name: 'ligature-products',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// =============================================================================
// HOOKS
// =============================================================================

export const useProducts = () => useProductsStore((s) => s.products);

export const useSelectedProduct = () => {
  const products = useProductsStore((s) => s.products);
  const selectedId = useProductsStore((s) => s.selectedProductId);
  return products.find((p) => p.id === selectedId) ?? null;
};

export const useProductSyncState = () => useProductsStore((s) => ({
  isLoading: s.isLoading,
  lastSynced: s.lastSynced,
  syncError: s.syncError,
  dataSource: s.dataSource,
}));

export const useProductActions = () => useProductsStore((s) => ({
  fetchProducts: s.fetchProducts,
  createProductAsync: s.createProductAsync,
  updateProductAsync: s.updateProductAsync,
  deleteProductAsync: s.deleteProductAsync,
  selectProduct: s.selectProduct,
}));

// Legacy compatibility - export getProduct function
export const getProduct = (id: string) => useProductsStore.getState().getProduct(id);
