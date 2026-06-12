
// v0.33.16: Updated FilterBar to use products store
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { applications } from '@/data/mock';
import { useToast } from '@/components/ui/Toast';
import { ProductContextSelector } from '@/components/ui/ProductContextSelector';
import { useProducts } from '@/stores/products-store';

export interface FilterState {
  product: string;
  therapeuticArea: string;
  modality: string;
  region: string;
  stage: string;
  applicationType: string;
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  showApplicationFilter?: boolean;
  useEnhancedProductSelector?: boolean;
}

// Static options
const regionOptions: FilterOption[] = [
  { value: 'all', label: 'Global' },
  { value: 'US', label: 'US', count: applications.filter(a => a.region === 'US').length },
  { value: 'EU', label: 'EU', count: applications.filter(a => a.region === 'EU').length },
  { value: 'Japan', label: 'Japan', count: applications.filter(a => a.region === 'Japan').length },
];

const stageOptions: FilterOption[] = [
  { value: 'all', label: 'All Stages' },
  { value: 'preclinical', label: 'Preclinical' },
  { value: 'phase-1', label: 'Phase 1' },
  { value: 'phase-2', label: 'Phase 2' },
  { value: 'phase-3', label: 'Phase 3' },
  { value: 'filed', label: 'Filed' },
  { value: 'approved', label: 'Approved' },
];

const appTypeOptions: FilterOption[] = [
  { value: 'all', label: 'All Types' },
  { value: 'IND', label: 'IND', count: applications.filter(a => a.type === 'IND').length },
  { value: 'NDA', label: 'NDA', count: applications.filter(a => a.type === 'NDA').length },
  { value: 'BLA', label: 'BLA', count: applications.filter(a => a.type === 'BLA').length },
  { value: 'sNDA', label: 'sNDA', count: applications.filter(a => a.type === 'sNDA').length },
  { value: 'MAA', label: 'MAA', count: applications.filter(a => a.type === 'MAA').length },
];

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">{label}</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm ${
            value !== 'all'
              ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
              : 'bg-surface-elevated border-border text-text-secondary'
          }`}
        >
          <span className="truncate max-w-[150px]">
            {selectedOption.label}{selectedOption.count !== undefined ? ` (${selectedOption.count})` : ''}
          </span>
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg z-20 min-w-[200px] max-h-[300px] overflow-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-card transition-colors ${
                  option.value === value ? 'text-accent-blue bg-accent-blue/5' : 'text-text-secondary'
                }`}
              >
                {option.label}
                {option.count !== undefined && <span className="text-text-muted ml-2">({option.count})</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({ filters, onFiltersChange, showApplicationFilter = false, useEnhancedProductSelector = false }: FilterBarProps) {
  // Use products from store instead of mock data
  const products = useProducts();
  const activeFilters = Object.entries(filters).filter(([, v]) => v !== 'all').length;
  const toast = useToast();
  // v0.43.8: Collapsed by default on mobile
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Build options dynamically from store data
  const productOptions = useMemo<FilterOption[]>(() => [
    { value: 'all', label: 'All Products', count: products.length },
    ...products.map(p => ({ value: p.id, label: `${p.name} - ${p.genericName || ''}` }))
  ], [products]);

  const taOptions = useMemo<FilterOption[]>(() => {
    const taSet = new Set(products.map(p => p.therapeuticArea));
    return [
      { value: 'all', label: 'All TAs' },
      ...Array.from(taSet).map(ta => ({
        value: ta.toLowerCase().replace(/\s+/g, '-'),
        label: ta,
        count: products.filter(p => p.therapeuticArea === ta).length
      }))
    ];
  }, [products]);

  const modalityOptions = useMemo<FilterOption[]>(() => {
    const modalitySet = new Set(products.map(p => p.modality));
    return [
      { value: 'all', label: 'All Modalities' },
      ...Array.from(modalitySet).map(m => ({
        value: m.toLowerCase().replace(/\s+/g, '-'),
        label: m,
        count: products.filter(p => p.modality === m).length
      }))
    ];
  }, [products]);

  const clearFilters = () => {
    onFiltersChange({
      product: 'all',
      therapeuticArea: 'all',
      modality: 'all',
      region: 'all',
      stage: 'all',
      applicationType: 'all',
    });
    toast.info('Showing all products — filters cleared');
  };

  // Calculate filtered count based on all active filters
  let filteredProducts = [...products];
  
  if (filters.product !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.id === filters.product);
  }
  if (filters.therapeuticArea !== 'all') {
    const ta = taOptions.find(t => t.value === filters.therapeuticArea)?.label;
    filteredProducts = filteredProducts.filter(p => p.therapeuticArea === ta);
  }
  if (filters.modality !== 'all') {
    const mod = modalityOptions.find(m => m.value === filters.modality)?.label;
    filteredProducts = filteredProducts.filter(p => p.modality === mod);
  }
  if (filters.stage !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.stage.toLowerCase().replace(/\s+/g, '-') === filters.stage);
  }

  const filteredCount = filteredProducts.length;

  // Handler for ProductContextSelector
  const handleProductSelectorChange = (value: string | string[]) => {
    const productId = Array.isArray(value) ? (value[0] || 'all') : value;
    onFiltersChange({ ...filters, product: productId });
  };

  return (
    <div className="bg-surface-card border-b border-border">
      {/* v0.43.8: Compact mobile header row — always visible */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
        {/* Mobile toggle */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border text-text-secondary hover:bg-surface-elevated transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFilters > 0 && (
            <span className="bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full text-xs">{activeFilters}</span>
          )}
          {filtersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Desktop: show filter dropdowns inline */}
        <div className="hidden sm:flex items-center gap-3 flex-wrap flex-1">
          {/* Enhanced Product Selector or classic dropdown */}
          {useEnhancedProductSelector ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Product</span>
              <ProductContextSelector
                mode="single"
                value={filters.product}
                onChange={handleProductSelectorChange}
                showQuickFilters={true}
                showFavorites={true}
                showRecent={true}
                variant="header"
                compact={false}
                placeholder="All Products"
              />
            </div>
          ) : (
            <FilterDropdown
              label="Product"
              options={productOptions}
              value={filters.product}
              onChange={(v) => onFiltersChange({ ...filters, product: v })}
            />
          )}
          <FilterDropdown
            label="TA"
            options={taOptions}
            value={filters.therapeuticArea}
            onChange={(v) => onFiltersChange({ ...filters, therapeuticArea: v })}
          />
          <FilterDropdown
            label="Modality"
            options={modalityOptions}
            value={filters.modality}
            onChange={(v) => onFiltersChange({ ...filters, modality: v })}
          />
          <FilterDropdown
            label="Region"
            options={regionOptions}
            value={filters.region}
            onChange={(v) => onFiltersChange({ ...filters, region: v })}
          />
          <FilterDropdown
            label="Stage"
            options={stageOptions}
            value={filters.stage}
            onChange={(v) => onFiltersChange({ ...filters, stage: v })}
          />
          
          {showApplicationFilter && (
            <FilterDropdown
              label="App Type"
              options={appTypeOptions}
              value={filters.applicationType}
              onChange={(v) => onFiltersChange({ ...filters, applicationType: v })}
            />
          )}
        </div>

        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Active filter count pill */}
          {activeFilters > 0 && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-accent-blue/15 text-accent-blue text-xs rounded-full font-medium">
              {activeFilters} filter{activeFilters !== 1 ? 's' : ''} active
            </span>
          )}
          {/* View All — always visible, prominent when filters are active */}
          <button
            onClick={clearFilters}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              activeFilters > 0
                ? 'bg-accent-blue text-white border-accent-blue hover:bg-accent-blue/90 shadow-sm'
                : 'bg-surface-elevated border-border text-text-muted hover:text-text-secondary hover:border-border/80'
            }`}
          >
            <X className={`w-3 h-3 ${activeFilters > 0 ? 'opacity-100' : 'opacity-40'}`} />
            <span>View All</span>
          </button>
        </div>
      </div>

      {/* v0.43.8: Mobile expanded filter panel */}
      {filtersExpanded && (
        <div className="sm:hidden px-3 pb-3 flex flex-wrap gap-2 border-t border-border/50 pt-2">
          <FilterDropdown
            label="Product"
            options={productOptions}
            value={filters.product}
            onChange={(v) => onFiltersChange({ ...filters, product: v })}
          />
          <FilterDropdown
            label="TA"
            options={taOptions}
            value={filters.therapeuticArea}
            onChange={(v) => onFiltersChange({ ...filters, therapeuticArea: v })}
          />
          <FilterDropdown
            label="Region"
            options={regionOptions}
            value={filters.region}
            onChange={(v) => onFiltersChange({ ...filters, region: v })}
          />
          <FilterDropdown
            label="Stage"
            options={stageOptions}
            value={filters.stage}
            onChange={(v) => onFiltersChange({ ...filters, stage: v })}
          />
          {showApplicationFilter && (
            <FilterDropdown
              label="App Type"
              options={appTypeOptions}
              value={filters.applicationType}
              onChange={(v) => onFiltersChange({ ...filters, applicationType: v })}
            />
          )}
          {activeFilters > 0 && (
            <button
              onClick={() => { clearFilters(); setFiltersExpanded(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white text-xs font-medium rounded-lg"
            >
              <X className="w-3 h-3" />View All
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Export default filters
export const defaultFilters: FilterState = {
  product: 'all',
  therapeuticArea: 'all',
  modality: 'all',
  region: 'all',
  stage: 'all',
  applicationType: 'all',
};
