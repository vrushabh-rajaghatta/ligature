

// Product Switcher - Enterprise Multi-Product Selection (v151)
// Global command-palette style switcher that works across all modules

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  Search, Star, Clock, ChevronDown, ChevronRight, Check, X, 
  Pill, Building2, Layers, Filter, Grid, List, Package, 
  ArrowUpDown, Microscope, Heart, TrendingUp
} from 'lucide-react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import {
  useProductContextStore,
  ProductWithMeta,
  ProductGroup,
  ProductGroupBy,
  ProductSortBy,
} from '@/store/useProductContextStore';

// ============================================
// Color Maps
// ============================================

const stageColorMap: Record<string, BadgeColor> = {
  'Discovery': 'slate',
  'Preclinical': 'violet',
  'IND-Enabling': 'purple',
  'Phase 1': 'blue',
  'Phase 1/2': 'blue',
  'Phase 2': 'teal',
  'Phase 2/3': 'cyan',
  'Phase 3': 'blue',
  'NDA Filed': 'amber',
  'BLA Filed': 'amber',
  'sNDA Filed': 'orange',
  'Approved': 'green',
  'Post-Marketing': 'emerald',
};

const modalityIconMap: Record<string, React.ReactNode> = {
  'Small Molecule': <Pill className="w-3.5 h-3.5" />,
  'Monoclonal Antibody': <Microscope className="w-3.5 h-3.5" />,
  'Bispecific Antibody': <Layers className="w-3.5 h-3.5" />,
  'ADC': <Package className="w-3.5 h-3.5" />,
  'Gene Therapy': <TrendingUp className="w-3.5 h-3.5" />,
  'mRNA Therapy': <TrendingUp className="w-3.5 h-3.5" />,
  'Enzyme Replacement': <Heart className="w-3.5 h-3.5" />,
};

// ============================================
// Product Item Component
// ============================================

interface ProductItemProps {
  product: ProductWithMeta;
  isSelected: boolean;
  isFavorite: boolean;
  compact?: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

function ProductItem({ product, isSelected, isFavorite, compact, onSelect, onToggleFavorite }: ProductItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        group flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg transition-all
        ${isSelected 
          ? 'bg-accent-blue/10 border border-accent-blue/30' 
          : 'hover:bg-surface-card border border-transparent'
        }
      `}
    >
      {/* Selection indicator */}
      <div className={`
        w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
        ${isSelected 
          ? 'bg-accent-blue border-accent-blue' 
          : 'border-border group-hover:border-text-muted'
        }
      `}>
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>
      
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary truncate">{product.name}</span>
          {product.brandName && (
            <span className="text-xs text-text-muted truncate hidden sm:inline">({product.brandName})</span>
          )}
        </div>
        {!compact && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-secondary truncate">{product.indication}</span>
          </div>
        )}
      </div>
      
      {/* Metadata badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!compact && (
          <>
            <Badge color={stageColorMap[product.stage] || 'slate'} size="xs">
              {product.stage}
            </Badge>
            <span className="text-xs text-text-muted hidden lg:inline">{product.therapeuticArea}</span>
          </>
        )}
        
        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`
            p-1 rounded transition-colors
            ${isFavorite 
              ? 'text-accent-amber' 
              : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent-amber'
            }
          `}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}

// ============================================
// Product Group Component
// ============================================

interface ProductGroupSectionProps {
  group: ProductGroup;
  selectedIds: Set<string>;
  favoriteIds: Set<string>;
  compact?: boolean;
  onSelectProduct: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  defaultExpanded?: boolean;
}

function ProductGroupSection({ 
  group, 
  selectedIds, 
  favoriteIds, 
  compact,
  onSelectProduct, 
  onToggleFavorite,
  defaultExpanded = true,
}: ProductGroupSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <span>{group.label}</span>
        <Badge color="slate" size="xs">{group.count}</Badge>
      </button>
      
      {isExpanded && (
        <div className="ml-2">
          {group.products.map(product => (
            <ProductItem
              key={product.id}
              product={product}
              isSelected={selectedIds.has(product.id)}
              isFavorite={favoriteIds.has(product.id)}
              compact={compact}
              onSelect={() => onSelectProduct(product.id)}
              onToggleFavorite={() => onToggleFavorite(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Filters Panel
// ============================================

interface FiltersPanelProps {
  therapeuticAreas: string[];
  modalities: string[];
  stages: string[];
  selectedTA: string | null;
  selectedModality: string | null;
  selectedStage: string | null;
  onTAChange: (ta: string | null) => void;
  onModalityChange: (modality: string | null) => void;
  onStageChange: (stage: string | null) => void;
  onClear: () => void;
}

function FiltersPanel({
  therapeuticAreas,
  modalities,
  stages,
  selectedTA,
  selectedModality,
  selectedStage,
  onTAChange,
  onModalityChange,
  onStageChange,
  onClear,
}: FiltersPanelProps) {
  const hasFilters = selectedTA || selectedModality || selectedStage;
  
  return (
    <div className="p-3 border-b border-border bg-surface-card/50 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Filters</span>
        {hasFilters && (
          <button onClick={onClear} className="text-xs text-accent-blue hover:underline">
            Clear all
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {/* Therapeutic Area */}
        <select
          value={selectedTA || ''}
          onChange={(e) => onTAChange(e.target.value || null)}
          className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5 text-text-primary"
        >
          <option value="">All TAs</option>
          {therapeuticAreas.map(ta => (
            <option key={ta} value={ta}>{ta}</option>
          ))}
        </select>
        
        {/* Modality */}
        <select
          value={selectedModality || ''}
          onChange={(e) => onModalityChange(e.target.value || null)}
          className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5 text-text-primary"
        >
          <option value="">All Modalities</option>
          {modalities.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        
        {/* Stage */}
        <select
          value={selectedStage || ''}
          onChange={(e) => onStageChange(e.target.value || null)}
          className="text-sm bg-surface border border-border rounded-lg px-2 py-1.5 text-text-primary"
        >
          <option value="">All Stages</option>
          {stages.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ============================================
// Main Product Switcher Component
// ============================================

export interface ProductSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect?: (productIds: string[]) => void;
  multiSelect?: boolean;
  showFilters?: boolean;
  title?: string;
}

export function ProductSwitcher({
  isOpen,
  onClose,
  onProductSelect,
  multiSelect = false,
  showFilters = true,
  title = 'Select Product',
}: ProductSwitcherProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  
  // Store state
  const selectedIds = useProductContextStore(s => s.selectedProductIds);
  const favoriteIds = useProductContextStore(s => s.favoriteProductIds);
  const groupBy = useProductContextStore(s => s.groupBy);
  const sortBy = useProductContextStore(s => s.sortBy);
  const searchQuery = useProductContextStore(s => s.searchQuery);
  const taFilter = useProductContextStore(s => s.therapeuticAreaFilter);
  const modalityFilter = useProductContextStore(s => s.modalityFilter);
  const stageFilter = useProductContextStore(s => s.stageFilter);
  const isCompact = useProductContextStore(s => s.isCompactMode);
  
  // Actions
  const toggleProductSelection = useProductContextStore(s => s.toggleProductSelection);
  const selectProduct = useProductContextStore(s => s.selectProduct);
  const toggleFavorite = useProductContextStore(s => s.toggleFavorite);
  const setSearchQuery = useProductContextStore(s => s.setSearchQuery);
  const setGroupBy = useProductContextStore(s => s.setGroupBy);
  const setSortBy = useProductContextStore(s => s.setSortBy);
  const setTAFilter = useProductContextStore(s => s.setTherapeuticAreaFilter);
  const setModalityFilter = useProductContextStore(s => s.setModalityFilter);
  const setStageFilter = useProductContextStore(s => s.setStageFilter);
  const clearFilters = useProductContextStore(s => s.clearFilters);
  const setCompactMode = useProductContextStore(s => s.setCompactMode);
  const setSelectionMode = useProductContextStore(s => s.setSelectionMode);
  const loadMockData = useProductContextStore(s => s.loadMockData);
  
  // Data from store - use getters in useMemo to avoid re-renders
  const products = useProductContextStore(s => s.products);
  const getFilteredProducts = useProductContextStore(s => s.getFilteredProducts);
  const getGroupedProducts = useProductContextStore(s => s.getGroupedProducts);
  const getFavoriteProducts = useProductContextStore(s => s.getFavoriteProducts);
  const getRecentProducts = useProductContextStore(s => s.getRecentProducts);
  
  // Memoize derived data
  const filteredProducts = useMemo(() => getFilteredProducts(), [products, searchQuery, taFilter, modalityFilter, stageFilter, sortBy]);
  const groupedProducts = useMemo(() => getGroupedProducts(), [products, groupBy, searchQuery, taFilter, modalityFilter, stageFilter]);
  const favoriteProducts = useMemo(() => getFavoriteProducts(), [products, favoriteIds]);
  const recentProducts = useMemo(() => getRecentProducts(), [products]);
  
  // Get unique filter values
  const therapeuticAreas = useMemo(() => Array.from(new Set(Object.values(products).map(p => p.therapeuticArea).filter(Boolean))), [products]);
  const modalities = useMemo(() => Array.from(new Set(Object.values(products).map(p => p.modality).filter(Boolean))), [products]);
  const stages = useMemo(() => Array.from(new Set(Object.values(products).map(p => p.stage).filter(Boolean))), [products]);
  
  // Load mock data if empty
  const productCount = Object.keys(products).length;
  useEffect(() => {
    if (productCount === 0) {
      loadMockData();
    }
  }, [productCount, loadMockData]);
  
  // Focus search on open
  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Set selection mode based on multiSelect prop
  useEffect(() => {
    setSelectionMode(multiSelect ? 'multi' : 'single');
  }, [multiSelect, setSelectionMode]);
  
  const handleProductSelect = useCallback((productId: string) => {
    if (multiSelect) {
      toggleProductSelection(productId);
    } else {
      selectProduct(productId);
      onProductSelect?.([productId]);
      onClose();
    }
  }, [multiSelect, toggleProductSelection, selectProduct, onProductSelect, onClose]);
  
  const handleConfirm = useCallback(() => {
    const ids = Array.from(selectedIds);
    onProductSelect?.(ids);
    onClose();
  }, [selectedIds, onProductSelect, onClose]);
  
  // Determine which products to show based on tab
  const displayProducts = useMemo(() => {
    switch (activeTab) {
      case 'favorites':
        return favoriteProducts;
      case 'recent':
        return recentProducts;
      default:
        return filteredProducts;
    }
  }, [activeTab, filteredProducts, favoriteProducts, recentProducts]);
  
  if (!isOpen) return null;
  
  const hasActiveFilters = taFilter || modalityFilter || stageFilter || searchQuery;
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <div className="flex items-center gap-2">
            {multiSelect && selectedIds.size > 0 && (
              <Badge color="blue" size="sm">{selectedIds.size} selected</Badge>
            )}
            <button onClick={onClose} className="p-1 hover:bg-surface-card rounded">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>
        
        {/* Search and controls */}
        <div className="p-3 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, brand, indication..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </button>
              )}
            </div>
            
            {showFilters && (
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`
                  p-2 rounded-lg border transition-colors
                  ${showFiltersPanel || hasActiveFilters
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border text-text-muted hover:bg-surface-card'
                  }
                `}
              >
                <Filter className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={() => setCompactMode(!isCompact)}
              className={`p-2 rounded-lg border border-border text-text-muted hover:bg-surface-card transition-colors`}
              title={isCompact ? 'Detailed view' : 'Compact view'}
            >
              {isCompact ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeTab === 'all' 
                  ? 'bg-accent-blue/10 text-accent-blue font-medium' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All ({filteredProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'favorites' 
                  ? 'bg-accent-amber/10 text-accent-amber font-medium' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              Favorites ({favoriteProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'recent' 
                  ? 'bg-accent-blue/10 text-accent-blue font-medium' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Recent ({recentProducts.length})
            </button>
            
            <div className="flex-1" />
            
            {/* Group by selector */}
            {activeTab === 'all' && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as ProductGroupBy)}
                className="text-xs bg-surface border border-border rounded px-2 py-1 text-text-secondary"
              >
                <option value="none">No grouping</option>
                <option value="therapeuticArea">By Therapeutic Area</option>
                <option value="modality">By Modality</option>
                <option value="stage">By Stage</option>
              </select>
            )}
          </div>
        </div>
        
        {/* Filters panel */}
        {showFiltersPanel && showFilters && (
          <FiltersPanel
            therapeuticAreas={therapeuticAreas}
            modalities={modalities}
            stages={stages}
            selectedTA={taFilter}
            selectedModality={modalityFilter}
            selectedStage={stageFilter}
            onTAChange={setTAFilter}
            onModalityChange={setModalityFilter}
            onStageChange={setStageFilter}
            onClear={clearFilters}
          />
        )}
        
        {/* Product list */}
        <div className="flex-1 overflow-y-auto p-2">
          {displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs mt-1">
                {activeTab === 'favorites' 
                  ? 'Star products to add them to favorites' 
                  : activeTab === 'recent'
                  ? 'Select products to see them here'
                  : 'Try adjusting your filters'
                }
              </p>
            </div>
          ) : activeTab === 'all' && groupBy !== 'none' ? (
            // Grouped view
            groupedProducts.map(group => (
              <ProductGroupSection
                key={group.id}
                group={group}
                selectedIds={selectedIds}
                favoriteIds={favoriteIds}
                compact={isCompact}
                onSelectProduct={handleProductSelect}
                onToggleFavorite={toggleFavorite}
                defaultExpanded={groupedProducts.length <= 5}
              />
            ))
          ) : (
            // Flat list
            displayProducts.map(product => (
              <ProductItem
                key={product.id}
                product={product}
                isSelected={selectedIds.has(product.id)}
                isFavorite={favoriteIds.has(product.id)}
                compact={isCompact}
                onSelect={() => handleProductSelect(product.id)}
                onToggleFavorite={() => toggleFavorite(product.id)}
              />
            ))
          )}
        </div>
        
        {/* Footer */}
        {multiSelect && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-surface-card/50">
            <div className="text-sm text-text-muted">
              {selectedIds.size === 0 
                ? 'Select products to continue' 
                : `${selectedIds.size} product${selectedIds.size !== 1 ? 's' : ''} selected`
              }
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleConfirm}
                disabled={selectedIds.size === 0}
              >
                Confirm Selection
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Product Context Indicator (Header Component)
// ============================================

export interface ProductContextIndicatorProps {
  className?: string;
  showCount?: boolean;
  maxDisplay?: number;
}

export function ProductContextIndicator({ 
  className = '', 
  showCount = true,
  maxDisplay = 2,
}: ProductContextIndicatorProps) {
  const selectedIds = useProductContextStore(s => s.selectedProductIds);
  const products = useProductContextStore(s => s.products);
  const openSwitcher = useProductContextStore(s => s.openSwitcher);
  
  const selectedProducts = useMemo(() => 
    Array.from(selectedIds).map(id => products[id]).filter(Boolean),
    [selectedIds, products]
  );
  
  if (selectedProducts.length === 0) {
    return (
      <button
        onClick={openSwitcher}
        className={`flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm text-text-muted hover:text-text-primary hover:border-text-muted transition-colors ${className}`}
      >
        <Package className="w-4 h-4" />
        <span>All Products</span>
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }
  
  const displayed = selectedProducts.slice(0, maxDisplay);
  const remaining = selectedProducts.length - maxDisplay;
  
  return (
    <button
      onClick={openSwitcher}
      className={`flex items-center gap-2 px-3 py-1.5 bg-accent-blue/10 border border-accent-blue/30 rounded-lg text-sm hover:bg-accent-blue/20 transition-colors ${className}`}
    >
      <Package className="w-4 h-4 text-accent-blue" />
      <div className="flex items-center gap-1">
        {displayed.map((p, i) => (
          <span key={p.id} className="text-text-primary font-medium">
            {p.name}{i < displayed.length - 1 ? ',' : ''}
          </span>
        ))}
        {remaining > 0 && (
          <Badge color="blue" size="xs">+{remaining}</Badge>
        )}
      </div>
      <ChevronDown className="w-3 h-3 text-accent-blue" />
    </button>
  );
}

// ============================================
// Global Switcher Wrapper (connects to store)
// ============================================

export function GlobalProductSwitcher() {
  const isOpen = useProductContextStore(s => s.isSwitcherOpen);
  const closeSwitcher = useProductContextStore(s => s.closeSwitcher);
  
  return (
    <ProductSwitcher
      isOpen={isOpen}
      onClose={closeSwitcher}
      showFilters
    />
  );
}
