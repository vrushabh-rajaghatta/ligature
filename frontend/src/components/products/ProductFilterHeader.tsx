

// Product Filter Header - Enterprise Multi-Product Context (v151)
// Inline product filtering and context for screens that display product-specific data

import { useState, useMemo, useEffect } from 'react';
import { 
  Package, ChevronDown, X, Star, Check, Search, Layers, Filter
} from 'lucide-react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useProductContextStore,
  ProductWithMeta,
} from '@/store/useProductContextStore';

// ============================================
// Stage color map
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

// ============================================
// Product Filter Dropdown
// ============================================

interface ProductFilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (productId: string | null) => void;
  selectedProductId: string | null;
  products: ProductWithMeta[];
  favoriteIds: Set<string>;
  onToggleFavorite: (productId: string) => void;
}

function ProductFilterDropdown({
  isOpen,
  onClose,
  onSelect,
  selectedProductId,
  products,
  favoriteIds,
  onToggleFavorite,
}: ProductFilterDropdownProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.brandName?.toLowerCase().includes(query) ||
      p.indication?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);
  
  // Group products by favorites
  const favoriteProducts = filteredProducts.filter(p => favoriteIds.has(p.id));
  const otherProducts = filteredProducts.filter(p => !favoriteIds.has(p.id));
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Dropdown */}
      <div className="absolute top-full left-0 mt-1 z-50 w-80 max-h-96 bg-surface-elevated border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent-blue"
              autoFocus
            />
          </div>
        </div>
        
        {/* Product list */}
        <div className="flex-1 overflow-y-auto">
          {/* All Products option */}
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-surface-card transition-colors ${
              selectedProductId === null ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              selectedProductId === null ? 'bg-accent-blue border-accent-blue' : 'border-border'
            }`}>
              {selectedProductId === null && <Check className="w-3 h-3 text-white" />}
            </div>
            <Layers className="w-4 h-4" />
            <span className="font-medium">All Products</span>
            <Badge color="slate" size="xs" className="ml-auto">{products.length}</Badge>
          </button>
          
          {/* Favorites section */}
          {favoriteProducts.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider bg-surface-card/50">
                Favorites
              </div>
              {favoriteProducts.map(product => (
                <ProductDropdownItem
                  key={product.id}
                  product={product}
                  isSelected={selectedProductId === product.id}
                  isFavorite={true}
                  onSelect={() => { onSelect(product.id); onClose(); }}
                  onToggleFavorite={() => onToggleFavorite(product.id)}
                />
              ))}
            </>
          )}
          
          {/* Other products */}
          {otherProducts.length > 0 && (
            <>
              {favoriteProducts.length > 0 && (
                <div className="px-3 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider bg-surface-card/50">
                  All Products
                </div>
              )}
              {otherProducts.map(product => (
                <ProductDropdownItem
                  key={product.id}
                  product={product}
                  isSelected={selectedProductId === product.id}
                  isFavorite={false}
                  onSelect={() => { onSelect(product.id); onClose(); }}
                  onToggleFavorite={() => onToggleFavorite(product.id)}
                />
              ))}
            </>
          )}
          
          {filteredProducts.length === 0 && (
            <div className="p-4 text-center text-text-muted text-sm">
              No products found
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface ProductDropdownItemProps {
  product: ProductWithMeta;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

function ProductDropdownItem({ product, isSelected, isFavorite, onSelect, onToggleFavorite }: ProductDropdownItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
        isSelected ? 'bg-accent-blue/10' : 'hover:bg-surface-card'
      }`}
    >
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
        isSelected ? 'bg-accent-blue border-accent-blue' : 'border-border'
      }`}>
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isSelected ? 'text-accent-blue' : 'text-text-primary'}`}>
            {product.name}
          </span>
          {product.brandName && (
            <span className="text-xs text-text-muted truncate">({product.brandName})</span>
          )}
        </div>
        <div className="text-xs text-text-muted truncate">{product.indication}</div>
      </div>
      
      <Badge color={stageColorMap[product.stage] || 'slate'} size="xs" className="flex-shrink-0">
        {product.stage}
      </Badge>
      
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={`p-1 rounded transition-colors flex-shrink-0 ${
          isFavorite ? 'text-accent-amber' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent-amber'
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}

// ============================================
// Main Product Filter Header Component
// ============================================

export interface ProductFilterHeaderProps {
  /** Currently selected product ID (null = all products) */
  selectedProductId: string | null;
  /** Callback when product selection changes */
  onProductChange: (productId: string | null) => void;
  /** Optional additional filters */
  showTherapeuticArea?: boolean;
  /** Optional className */
  className?: string;
  /** Compact mode */
  compact?: boolean;
}

export function ProductFilterHeader({
  selectedProductId,
  onProductChange,
  showTherapeuticArea = false,
  className = '',
  compact = false,
}: ProductFilterHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Store state - use useMemo to avoid creating new arrays on every render
  const productsMap = useProductContextStore(s => s.products);
  const products = useMemo(() => Object.values(productsMap), [productsMap]);
  const favoriteIds = useProductContextStore(s => s.favoriteProductIds);
  const toggleFavorite = useProductContextStore(s => s.toggleFavorite);
  const loadMockData = useProductContextStore(s => s.loadMockData);
  
  // Load data if needed - must be in useEffect to avoid infinite loop
  useEffect(() => {
    if (products.length === 0) {
      loadMockData();
    }
  }, [products.length, loadMockData]);
  
  const selectedProduct = selectedProductId 
    ? products.find(p => p.id === selectedProductId) 
    : null;
  
  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Product selector button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors
          ${selectedProductId 
            ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue' 
            : 'bg-surface-card border-border text-text-secondary hover:border-text-muted'
          }
        `}
      >
        <Package className="w-4 h-4" />
        
        {selectedProduct ? (
          <>
            <span className="font-medium text-sm">{selectedProduct.name}</span>
            {!compact && selectedProduct.brandName && (
              <span className="text-xs opacity-75">({selectedProduct.brandName})</span>
            )}
          </>
        ) : (
          <span className="text-sm">All Products</span>
        )}
        
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Clear button when product is selected */}
      {selectedProductId && (
        <button
          onClick={() => onProductChange(null)}
          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-card rounded transition-colors"
          title="Clear product filter"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      {/* Product count indicator */}
      {!compact && (
        <span className="text-xs text-text-muted">
          {products.length} product{products.length !== 1 ? 's' : ''}
        </span>
      )}
      
      {/* Dropdown */}
      <ProductFilterDropdown
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        onSelect={onProductChange}
        selectedProductId={selectedProductId}
        products={products}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}

// ============================================
// Multi-Product Filter (for screens that support it)
// ============================================

export interface MultiProductFilterProps {
  selectedProductIds: string[];
  onProductsChange: (productIds: string[]) => void;
  maxSelection?: number;
  className?: string;
}

export function MultiProductFilter({
  selectedProductIds,
  onProductsChange,
  maxSelection = 10,
  className = '',
}: MultiProductFilterProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const productsMap = useProductContextStore(s => s.products);
  const products = useMemo(() => Object.values(productsMap), [productsMap]);
  const favoriteIds = useProductContextStore(s => s.favoriteProductIds);
  const toggleFavorite = useProductContextStore(s => s.toggleFavorite);
  
  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
  
  const handleToggleProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      onProductsChange(selectedProductIds.filter(id => id !== productId));
    } else if (selectedProductIds.length < maxSelection) {
      onProductsChange([...selectedProductIds, productId]);
    }
  };
  
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-xs text-text-muted">Products:</span>
      
      {selectedProducts.length === 0 ? (
        <Badge color="slate" size="sm">All ({products.length})</Badge>
      ) : (
        <>
          {selectedProducts.slice(0, 3).map(p => (
            <button 
              key={p.id}
              onClick={() => handleToggleProduct(p.id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
            >
              {p.name}
              <X className="w-3 h-3" />
            </button>
          ))}
          {selectedProducts.length > 3 && (
            <Badge color="blue" size="sm">+{selectedProducts.length - 3}</Badge>
          )}
        </>
      )}
      
      <Button
        variant="ghost"
        size="xs"
        icon={<Filter className="w-3.5 h-3.5" />}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {selectedProducts.length === 0 ? 'Filter' : 'Edit'}
      </Button>
      
      {selectedProducts.length > 0 && (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onProductsChange([])}
        >
          Clear
        </Button>
      )}
    </div>
  );
}

// ============================================
// Quick Product Stats Bar
// ============================================

export interface ProductStatsBarProps {
  productId: string | null;
  className?: string;
}

export function ProductStatsBar({ productId, className = '' }: ProductStatsBarProps) {
  const product = useProductContextStore(s => productId ? s.products[productId] : null);
  
  if (!product) return null;
  
  return (
    <div className={`flex items-center gap-4 text-xs text-text-muted ${className}`}>
      <span>
        <strong className="text-text-secondary">{product.submissionCount || 0}</strong> submissions
      </span>
      <span>
        <strong className="text-text-secondary">{product.documentCount || 0}</strong> documents
      </span>
      {(product.openHAQs || 0) > 0 && (
        <span className="text-accent-amber">
          <strong>{product.openHAQs}</strong> open HAQs
        </span>
      )}
      <Badge color={stageColorMap[product.stage] || 'slate'} size="xs">
        {product.stage}
      </Badge>
    </div>
  );
}
