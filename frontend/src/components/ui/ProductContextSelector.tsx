

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronDown,
  X,
  Star,
  StarOff,
  Building2,
  Pill,
  Beaker,
  Filter,
  Check,
  Clock,
  TrendingUp,
  Package,
  ArrowRight,
} from 'lucide-react';
import { applications } from '@/data/mock';
import { useProducts } from '@/stores/products-store';
import type { Product } from '@/types/core';
import { Badge } from './Badge';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductContextState {
  selectedProductId: string | null;
  selectedProductIds: string[]; // For multi-select mode
  favorites: string[];
  recentlyViewed: string[];
  quickFilters: {
    therapeuticArea: string | null;
    stage: string | null;
    modality: string | null;
  };
}

export interface ProductContextSelectorProps {
  mode?: 'single' | 'multi';
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  onProductSelect?: (product: Product) => void;
  showQuickFilters?: boolean;
  showFavorites?: boolean;
  showRecent?: boolean;
  maxDisplayProducts?: number;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'inline' | 'header';
}

// ============================================================================
// STAGE COLORS
// ============================================================================

const stageColorMap: Record<string, 'red' | 'amber' | 'blue' | 'emerald' | 'purple' | 'gray' | 'teal' | 'cyan'> = {
  'Preclinical': 'gray',
  'Phase 1': 'blue',
  'Phase 1/2': 'blue',
  'Phase 2': 'cyan',
  'Phase 3': 'purple',
  'NDA Filed': 'amber',
  'BLA Filed': 'amber',
  'sNDA Filed': 'amber',
  'sBLA Filed': 'amber',
  'Approved': 'emerald',
};

const taColorMap: Record<string, string> = {
  'Oncology': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Immunology': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Neurology': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Rare Disease': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Cardiology': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Infectious Disease': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getProductApplications(productId: string) {
  return applications.filter(app => app.productId === productId);
}

function getProductStats(productId: string) {
  const apps = getProductApplications(productId);
  return {
    totalApplications: apps.length,
    activeINDs: apps.filter(a => a.type === 'IND' && a.status === 'Active').length,
    underReview: apps.filter(a => a.status === 'Under Review').length,
    approved: apps.filter(a => a.status === 'Approved').length,
  };
}

// ============================================================================
// PRODUCT CARD COMPONENT
// ============================================================================

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  compact?: boolean;
}

function ProductCard({ product, isSelected, isFavorite, onSelect, onToggleFavorite, compact }: ProductCardProps) {
  const stats = getProductStats(product.id);
  
  return (
    <div
      onClick={onSelect}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`
        group px-3 py-2.5 cursor-pointer transition-all border-l-2
        ${isSelected 
          ? 'bg-accent-blue/10 border-l-accent-blue' 
          : 'border-l-transparent hover:bg-surface-card hover:border-l-border'
        }
        focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:ring-inset
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {product.brandName || product.name}
            </span>
            {isSelected && <Check className="w-3.5 h-3.5 text-accent-blue flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-muted truncate">{product.name}</span>
            <span className="text-xs text-text-muted">•</span>
            <span className="text-xs text-text-muted truncate">{product.genericName}</span>
          </div>
          {!compact && (
            <div className="flex items-center gap-2 mt-1.5">
              <Badge color={stageColorMap[product.stage] || 'gray'} size="xs">
                {product.stage}
              </Badge>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${taColorMap[product.therapeuticArea] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                {product.therapeuticArea}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={isFavorite ? `Remove ${product.brandName || product.name} from favorites` : `Add ${product.brandName || product.name} to favorites`}
          className={`
            p-1 rounded transition-colors flex-shrink-0
            ${isFavorite 
              ? 'text-amber-400 hover:text-amber-300' 
              : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-amber-400'
            }
            focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:opacity-100
          `}
        >
          {isFavorite ? <Star className="w-4 h-4 fill-current" aria-hidden="true" /> : <StarOff className="w-4 h-4" aria-hidden="true" />}
          <span className="sr-only">{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</span>
        </button>
      </div>
      {!compact && stats.totalApplications > 0 && (
        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
          <span>{stats.totalApplications} app{stats.totalApplications !== 1 ? 's' : ''}</span>
          {stats.underReview > 0 && (
            <span className="text-amber-400">{stats.underReview} under review</span>
          )}
          {stats.approved > 0 && (
            <span className="text-emerald-400">{stats.approved} approved</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUICK FILTER PILLS
// ============================================================================

interface QuickFilterPillsProps {
  filters: ProductContextState['quickFilters'];
  onFilterChange: (key: keyof ProductContextState['quickFilters'], value: string | null) => void;
  products: Product[];
}

function QuickFilterPills({ filters, onFilterChange, products }: QuickFilterPillsProps) {
  const therapeuticAreas = useMemo(() => Array.from(new Set(products.map(p => p.therapeuticArea))), [products]);
  const stages = useMemo(() => Array.from(new Set(products.map(p => p.stage))), [products]);
  
  return (
    <div className="px-3 py-2 border-b border-border space-y-2">
      {/* TA Pills */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-text-muted mr-1">TA:</span>
        {therapeuticAreas.slice(0, 5).map(ta => (
          <button
            key={ta}
            onClick={() => onFilterChange('therapeuticArea', filters.therapeuticArea === ta ? null : ta)}
            className={`
              px-2 py-0.5 text-xs rounded-full transition-colors
              ${filters.therapeuticArea === ta 
                ? 'bg-accent-blue text-white' 
                : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
              }
            `}
          >
            {ta}
          </button>
        ))}
      </div>
      {/* Stage Pills */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-text-muted mr-1">Stage:</span>
        {['Phase 3', 'NDA Filed', 'BLA Filed', 'Approved'].map(stage => (
          <button
            key={stage}
            onClick={() => onFilterChange('stage', filters.stage === stage ? null : stage)}
            className={`
              px-2 py-0.5 text-xs rounded-full transition-colors
              ${filters.stage === stage 
                ? 'bg-accent-blue text-white' 
                : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
              }
            `}
          >
            {stage}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductContextSelector({
  mode = 'single',
  value,
  onChange,
  onProductSelect,
  showQuickFilters = true,
  showFavorites = true,
  showRecent = true,
  maxDisplayProducts = 50,
  placeholder = 'Select product...',
  className = '',
  compact = false,
  variant = 'default',
}: ProductContextSelectorProps) {
  const products = useProducts();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ligature-product-favorites');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ligature-product-recent');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [quickFilters, setQuickFilters] = useState<ProductContextState['quickFilters']>({
    therapeuticArea: null,
    stage: null,
    modality: null,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse value
  const selectedIds = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value === 'all' ? [] : [value];
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ligature-product-favorites', JSON.stringify(favorites));
    }
  }, [favorites]);

  // Save recent to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ligature-product-recent', JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q) ||
        p.genericName?.toLowerCase().includes(q) ||
        p.indication?.toLowerCase().includes(q) ||
        p.therapeuticArea?.toLowerCase().includes(q)
      );
    }
    
    // Apply quick filters
    if (quickFilters.therapeuticArea) {
      result = result.filter(p => p.therapeuticArea === quickFilters.therapeuticArea);
    }
    if (quickFilters.stage) {
      result = result.filter(p => p.stage === quickFilters.stage);
    }
    if (quickFilters.modality) {
      result = result.filter(p => p.modality === quickFilters.modality);
    }
    
    // Sort: favorites first, then by stage priority
    const stagePriority: Record<string, number> = {
      'NDA Filed': 1, 'BLA Filed': 1, 'sNDA Filed': 1,
      'Approved': 2,
      'Phase 3': 3,
      'Phase 2': 4,
      'Phase 1': 5,
      'Phase 1/2': 5,
      'Preclinical': 6,
    };
    
    result.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 0 : 1;
      const bFav = favorites.includes(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      
      const aPriority = stagePriority[a.stage] || 99;
      const bPriority = stagePriority[b.stage] || 99;
      return aPriority - bPriority;
    });
    
    return result.slice(0, maxDisplayProducts);
  }, [searchQuery, quickFilters, favorites, maxDisplayProducts]);

  // Get selected product(s) for display
  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedIds.includes(p.id));
  }, [selectedIds]);

  // Handlers
  const handleSelect = useCallback((product: Product) => {
    // Add to recent
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== product.id);
      return [product.id, ...filtered].slice(0, 10);
    });
    
    if (mode === 'single') {
      onChange?.(product.id);
      onProductSelect?.(product);
      setIsOpen(false);
    } else {
      const newIds = selectedIds.includes(product.id)
        ? selectedIds.filter(id => id !== product.id)
        : [...selectedIds, product.id];
      onChange?.(newIds);
    }
  }, [mode, selectedIds, onChange, onProductSelect]);

  const handleToggleFavorite = useCallback((productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const handleQuickFilterChange = useCallback((key: keyof ProductContextState['quickFilters'], value: string | null) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearSelection = useCallback(() => {
    onChange?.(mode === 'single' ? 'all' : []);
  }, [mode, onChange]);

  // Active filter count
  const activeFilterCount = Object.values(quickFilters).filter(Boolean).length;

  // Render trigger button content
  const renderTriggerContent = () => {
    if (selectedProducts.length === 0) {
      return (
        <span className="text-text-muted flex items-center gap-2">
          <Package className="w-4 h-4" />
          {placeholder}
        </span>
      );
    }
    
    if (selectedProducts.length === 1) {
      const p = selectedProducts[0];
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{p.brandName || p.name}</span>
          <Badge color={stageColorMap[p.stage] || 'gray'} size="xs">{p.stage}</Badge>
        </div>
      );
    }
    
    return (
      <span className="text-text-primary">
        {selectedProducts.length} products selected
      </span>
    );
  };

  // Variant-specific styles
  const variantStyles = {
    default: 'bg-surface-elevated border border-border rounded-lg',
    inline: 'bg-transparent border-none',
    header: 'bg-surface-card border border-border rounded-lg shadow-sm',
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Focus next product
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Focus previous product
    } else if (e.key === 'Enter') {
      // Select focused product
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={selectedProducts.length > 0 ? `Selected: ${selectedProducts.map(p => p.brandName || p.name).join(', ')}` : placeholder}
        tabIndex={0}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 w-full min-w-[200px]
          text-sm transition-colors
          ${variantStyles[variant]}
          ${isOpen ? 'ring-2 ring-accent-blue/50' : 'hover:bg-surface-card'}
        `}
      >
        {renderTriggerContent()}
        <div className="flex items-center gap-1">
          {selectedProducts.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="p-0.5 hover:bg-surface rounded text-text-muted hover:text-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 w-[400px] bg-surface-elevated border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          onKeyDown={handleListKeyDown}
        >
          {/* Announcer for screen readers */}
          <div aria-live="polite" className="sr-only">
            {filteredProducts.length} products available
          </div>
          
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, brand, indication..."
                aria-label="Search products by name, brand, indication"
                className="w-full pl-9 pr-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
              <span>{filteredProducts.length} of {products.length} products</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setQuickFilters({ therapeuticArea: null, stage: null, modality: null })}
                  className="text-accent-blue hover:underline"
                >
                  Clear filters ({activeFilterCount})
                </button>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          {showQuickFilters && (
            <QuickFilterPills filters={quickFilters} onFilterChange={handleQuickFilterChange} products={products} />
          )}

          {/* Favorites Section */}
          {showFavorites && favorites.length > 0 && !searchQuery && (
            <div className="border-b border-border">
              <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                Favorites
              </div>
              {products
                .filter(p => favorites.includes(p.id))
                .slice(0, 5)
                .map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedIds.includes(product.id)}
                    isFavorite={true}
                    onSelect={() => handleSelect(product)}
                    onToggleFavorite={() => handleToggleFavorite(product.id)}
                    compact={compact}
                  />
                ))
              }
            </div>
          )}

          {/* Recently Viewed Section */}
          {showRecent && recentlyViewed.length > 0 && !searchQuery && !quickFilters.therapeuticArea && !quickFilters.stage && (
            <div className="border-b border-border">
              <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent
              </div>
              {products
                .filter(p => recentlyViewed.includes(p.id) && !favorites.includes(p.id))
                .slice(0, 3)
                .map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selectedIds.includes(product.id)}
                    isFavorite={false}
                    onSelect={() => handleSelect(product)}
                    onToggleFavorite={() => handleToggleFavorite(product.id)}
                    compact={compact}
                  />
                ))
              }
            </div>
          )}

          {/* All Products */}
          <div className="max-h-[300px] overflow-y-auto" role="listbox" aria-label="Products">
            <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider sticky top-0 bg-surface-elevated">
              All Products
            </div>
            {filteredProducts.length === 0 ? (
              <div className="px-3 py-8 text-center text-text-muted text-sm">
                No products match your search
              </div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedIds.includes(product.id)}
                  isFavorite={favorites.includes(product.id)}
                  onSelect={() => handleSelect(product)}
                  onToggleFavorite={() => handleToggleFavorite(product.id)}
                  compact={compact}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-border bg-surface-card flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {mode === 'multi' && selectedIds.length > 0 && `${selectedIds.length} selected`}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-accent-blue hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT VARIANT FOR INLINE USE
// ============================================================================

export function ProductContextBadge({
  productId,
  onRemove,
  showStage = true,
}: {
  productId: string;
  onRemove?: () => void;
  showStage?: boolean;
}) {
  const products = useProducts();
  const product = products.find((p: Product) => p.id === productId);
  if (!product) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-card border border-border rounded-lg text-sm">
      <span className="font-medium text-text-primary">{product.brandName || product.name}</span>
      {showStage && (
        <Badge color={stageColorMap[product.stage] || 'gray'} size="xs">{product.stage}</Badge>
      )}
      {onRemove && (
        <button onClick={onRemove} className="text-text-muted hover:text-text-primary">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
