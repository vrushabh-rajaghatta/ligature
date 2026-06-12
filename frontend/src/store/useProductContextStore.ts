

// Product Context Store - Enterprise Multi-Product Portfolio Management (v151)
// Provides global product context that persists across all modules
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { products as mockProducts } from '@/data/mock';
import { Product } from '@/types/core';

// ============================================
// Types
// ============================================

export interface ProductWithMeta extends Product {
  // Extended product info for UI
  submissionCount?: number;
  documentCount?: number;
  openHAQs?: number;
  lastActivity?: string;
}

export type ProductSelectionMode = 'single' | 'multi';
export type ProductGroupBy = 'none' | 'therapeuticArea' | 'modality' | 'stage';
export type ProductSortBy = 'name' | 'brandName' | 'therapeuticArea' | 'stage' | 'recentActivity';

export interface ProductGroup {
  id: string;
  label: string;
  products: ProductWithMeta[];
  count: number;
}

export interface ProductContextState {
  // Core selection state
  selectedProductIds: Set<string>;
  selectionMode: ProductSelectionMode;
  
  // Quick access
  favoriteProductIds: Set<string>;
  recentProductIds: string[]; // Ordered, most recent first
  
  // View preferences
  groupBy: ProductGroupBy;
  sortBy: ProductSortBy;
  sortDesc: boolean;
  showArchived: boolean;
  
  // Search & filter
  searchQuery: string;
  therapeuticAreaFilter: string | null;
  modalityFilter: string | null;
  stageFilter: string | null;
  
  // UI state
  isSwitcherOpen: boolean;
  isCompactMode: boolean;
  
  // Product data (cached from various sources)
  products: Record<string, ProductWithMeta>;
}

export interface ProductContextActions {
  // Selection
  selectProduct: (productId: string) => void;
  selectProducts: (productIds: string[]) => void;
  toggleProductSelection: (productId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setSelectionMode: (mode: ProductSelectionMode) => void;
  
  // Favorites
  toggleFavorite: (productId: string) => void;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  
  // Recents
  addToRecent: (productId: string) => void;
  clearRecents: () => void;
  
  // View preferences
  setGroupBy: (groupBy: ProductGroupBy) => void;
  setSortBy: (sortBy: ProductSortBy) => void;
  toggleSortOrder: () => void;
  setShowArchived: (show: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  
  // Search & filter
  setSearchQuery: (query: string) => void;
  setTherapeuticAreaFilter: (ta: string | null) => void;
  setModalityFilter: (modality: string | null) => void;
  setStageFilter: (stage: string | null) => void;
  clearFilters: () => void;
  
  // UI state
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
  
  // Data management
  setProducts: (products: ProductWithMeta[]) => void;
  updateProduct: (productId: string, updates: Partial<ProductWithMeta>) => void;
  loadMockData: () => void;
  
  // Computed getters (as actions for efficiency)
  getSelectedProducts: () => ProductWithMeta[];
  getFavoriteProducts: () => ProductWithMeta[];
  getRecentProducts: () => ProductWithMeta[];
  getFilteredProducts: () => ProductWithMeta[];
  getGroupedProducts: () => ProductGroup[];
  getProductById: (id: string) => ProductWithMeta | null;
}

// ============================================
// Constants
// ============================================

const MAX_RECENT_PRODUCTS = 10;
const MAX_MULTI_SELECT = 20; // Prevent selecting entire portfolio

// ============================================
// Initial State
// ============================================

const initialState: ProductContextState = {
  selectedProductIds: new Set(),
  selectionMode: 'single',
  favoriteProductIds: new Set(),
  recentProductIds: [],
  groupBy: 'none',
  sortBy: 'name',
  sortDesc: false,
  showArchived: false,
  searchQuery: '',
  therapeuticAreaFilter: null,
  modalityFilter: null,
  stageFilter: null,
  isSwitcherOpen: false,
  isCompactMode: false,
  products: {},
};

// ============================================
// Store
// ============================================

export const useProductContextStore = create<ProductContextState & ProductContextActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===== SELECTION =====
      selectProduct: (productId) => {
        const product = get().products[productId];
        if (!product) return;
        
        set((s) => ({
          selectedProductIds: new Set([productId]),
        }));
        
        // Add to recents
        get().addToRecent(productId);
      },

      selectProducts: (productIds) => {
        const validIds = productIds.filter(id => get().products[id]).slice(0, MAX_MULTI_SELECT);
        set({ selectedProductIds: new Set(validIds) });
      },

      toggleProductSelection: (productId) => {
        const product = get().products[productId];
        if (!product) return;
        
        set((s) => {
          const newSet = new Set(s.selectedProductIds);
          if (newSet.has(productId)) {
            newSet.delete(productId);
          } else {
            if (s.selectionMode === 'single') {
              return { selectedProductIds: new Set([productId]) };
            }
            if (newSet.size < MAX_MULTI_SELECT) {
              newSet.add(productId);
            }
          }
          return { selectedProductIds: newSet };
        });
        
        get().addToRecent(productId);
      },

      clearSelection: () => {
        set({ selectedProductIds: new Set() });
      },

      selectAll: () => {
        const filtered = get().getFilteredProducts();
        const ids = filtered.slice(0, MAX_MULTI_SELECT).map(p => p.id);
        set({ selectedProductIds: new Set(ids), selectionMode: 'multi' });
      },

      setSelectionMode: (mode) => {
        set((s) => {
          if (mode === 'single' && s.selectedProductIds.size > 1) {
            // Keep only the first selected
            const first = Array.from(s.selectedProductIds)[0];
            return { selectionMode: mode, selectedProductIds: new Set(first ? [first] : []) };
          }
          return { selectionMode: mode };
        });
      },

      // ===== FAVORITES =====
      toggleFavorite: (productId) => {
        set((s) => {
          const newSet = new Set(s.favoriteProductIds);
          if (newSet.has(productId)) {
            newSet.delete(productId);
          } else {
            newSet.add(productId);
          }
          return { favoriteProductIds: newSet };
        });
      },

      addFavorite: (productId) => {
        set((s) => ({
          favoriteProductIds: new Set(Array.from(s.favoriteProductIds).concat([productId])),
        }));
      },

      removeFavorite: (productId) => {
        set((s) => {
          const newSet = new Set(s.favoriteProductIds);
          newSet.delete(productId);
          return { favoriteProductIds: newSet };
        });
      },

      // ===== RECENTS =====
      addToRecent: (productId) => {
        set((s) => {
          const filtered = s.recentProductIds.filter(id => id !== productId);
          return {
            recentProductIds: [productId, ...filtered].slice(0, MAX_RECENT_PRODUCTS),
          };
        });
      },

      clearRecents: () => {
        set({ recentProductIds: [] });
      },

      // ===== VIEW PREFERENCES =====
      setGroupBy: (groupBy) => set({ groupBy }),
      setSortBy: (sortBy) => set({ sortBy }),
      toggleSortOrder: () => set((s) => ({ sortDesc: !s.sortDesc })),
      setShowArchived: (show) => set({ showArchived: show }),
      setCompactMode: (compact) => set({ isCompactMode: compact }),

      // ===== SEARCH & FILTER =====
      setSearchQuery: (query) => set({ searchQuery: query }),
      setTherapeuticAreaFilter: (ta) => set({ therapeuticAreaFilter: ta }),
      setModalityFilter: (modality) => set({ modalityFilter: modality }),
      setStageFilter: (stage) => set({ stageFilter: stage }),
      
      clearFilters: () => set({
        searchQuery: '',
        therapeuticAreaFilter: null,
        modalityFilter: null,
        stageFilter: null,
      }),

      // ===== UI STATE =====
      openSwitcher: () => set({ isSwitcherOpen: true }),
      closeSwitcher: () => set({ isSwitcherOpen: false }),
      toggleSwitcher: () => set((s) => ({ isSwitcherOpen: !s.isSwitcherOpen })),

      // ===== DATA MANAGEMENT =====
      setProducts: (products) => {
        const record: Record<string, ProductWithMeta> = {};
        products.forEach(p => { record[p.id] = p; });
        set({ products: record });
      },

      updateProduct: (productId, updates) => {
        set((s) => {
          const existing = s.products[productId];
          if (!existing) return s;
          return {
            products: {
              ...s.products,
              [productId]: { ...existing, ...updates },
            },
          };
        });
      },

      loadMockData: () => {
        const record: Record<string, ProductWithMeta> = {};
        mockProducts.forEach(p => {
          record[p.id] = {
            ...p,
            submissionCount: Math.floor(Math.random() * 5) + 1,
            documentCount: Math.floor(Math.random() * 50) + 10,
            openHAQs: Math.floor(Math.random() * 8),
            lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
        });
        set({ products: record });
      },

      // ===== COMPUTED GETTERS =====
      getSelectedProducts: () => {
        const { selectedProductIds, products } = get();
        return Array.from(selectedProductIds)
          .map(id => products[id])
          .filter(Boolean) as ProductWithMeta[];
      },

      getFavoriteProducts: () => {
        const { favoriteProductIds, products } = get();
        return Array.from(favoriteProductIds)
          .map(id => products[id])
          .filter(Boolean) as ProductWithMeta[];
      },

      getRecentProducts: () => {
        const { recentProductIds, products } = get();
        return recentProductIds
          .map(id => products[id])
          .filter(Boolean) as ProductWithMeta[];
      },

      getFilteredProducts: () => {
        const state = get();
        let result = Object.values(state.products);
        
        // Search
        if (state.searchQuery.trim()) {
          const query = state.searchQuery.toLowerCase();
          result = result.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.brandName?.toLowerCase().includes(query) ||
            p.genericName?.toLowerCase().includes(query) ||
            p.indication?.toLowerCase().includes(query) ||
            p.therapeuticArea?.toLowerCase().includes(query)
          );
        }
        
        // Filters
        if (state.therapeuticAreaFilter) {
          result = result.filter(p => p.therapeuticArea === state.therapeuticAreaFilter);
        }
        if (state.modalityFilter) {
          result = result.filter(p => p.modality === state.modalityFilter);
        }
        if (state.stageFilter) {
          result = result.filter(p => p.stage === state.stageFilter);
        }
        
        // Sort
        result.sort((a, b) => {
          let cmp = 0;
          switch (state.sortBy) {
            case 'name':
              cmp = a.name.localeCompare(b.name);
              break;
            case 'brandName':
              cmp = (a.brandName || '').localeCompare(b.brandName || '');
              break;
            case 'therapeuticArea':
              cmp = (a.therapeuticArea || '').localeCompare(b.therapeuticArea || '');
              break;
            case 'stage':
              cmp = (a.stage || '').localeCompare(b.stage || '');
              break;
            case 'recentActivity':
              cmp = new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
              break;
          }
          return state.sortDesc ? -cmp : cmp;
        });
        
        return result;
      },

      getGroupedProducts: () => {
        const state = get();
        const filtered = get().getFilteredProducts();
        
        if (state.groupBy === 'none') {
          return [{ id: 'all', label: 'All Products', products: filtered, count: filtered.length }];
        }
        
        const groups: Record<string, ProductWithMeta[]> = {};
        
        filtered.forEach(product => {
          let key: string;
          switch (state.groupBy) {
            case 'therapeuticArea':
              key = product.therapeuticArea || 'Other';
              break;
            case 'modality':
              key = product.modality || 'Other';
              break;
            case 'stage':
              key = product.stage || 'Unknown';
              break;
            default:
              key = 'All';
          }
          
          if (!groups[key]) groups[key] = [];
          groups[key].push(product);
        });
        
        return Object.entries(groups)
          .map(([label, products]) => ({
            id: label.toLowerCase().replace(/\s+/g, '-'),
            label,
            products,
            count: products.length,
          }))
          .sort((a, b) => b.count - a.count);
      },

      getProductById: (id) => get().products[id] || null,
    }),
    {
      name: 'ligature-product-context',
      partialize: (state) => ({
        selectedProductIds: Array.from(state.selectedProductIds),
        favoriteProductIds: Array.from(state.favoriteProductIds),
        recentProductIds: state.recentProductIds,
        groupBy: state.groupBy,
        sortBy: state.sortBy,
        sortDesc: state.sortDesc,
        isCompactMode: state.isCompactMode,
      }),
      merge: (persisted: Record<string, unknown>, current) => ({
        ...current,
        ...persisted,
        selectedProductIds: new Set(persisted?.selectedProductIds as string[] || []),
        favoriteProductIds: new Set(persisted?.favoriteProductIds as string[] || []),
      }),
    }
  )
);

// ============================================
// Selector Hooks - Use direct state access to avoid creating new objects
// ============================================

export const useSelectedProductIds = () => useProductContextStore(s => s.selectedProductIds);
export const useFavoriteProductIds = () => useProductContextStore(s => s.favoriteProductIds);
export const useRecentProductIds = () => useProductContextStore(s => s.recentProductIds);
export const useProducts = () => useProductContextStore(s => s.products);

export const useHasSelectedProducts = () => useProductContextStore(s => s.selectedProductIds.size > 0);
export const useSelectedCount = () => useProductContextStore(s => s.selectedProductIds.size);
export const useProductCount = () => useProductContextStore(s => Object.keys(s.products).length);

export const useIsProductSelected = (productId: string) => 
  useProductContextStore(s => s.selectedProductIds.has(productId));
export const useIsProductFavorite = (productId: string) => 
  useProductContextStore(s => s.favoriteProductIds.has(productId));
