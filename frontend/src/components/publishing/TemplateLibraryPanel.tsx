// =============================================================================
// TEMPLATE LIBRARY PANEL - Mockup v1.0
// =============================================================================
// Pre-built submission templates for rapid eCTD assembly
// Inspired by RIMSmart's 340+ templates claim
// =============================================================================


import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Star,
  Clock,
  ChevronRight,
  Globe,
  CheckCircle,
  AlertCircle,
  Folder,
  Copy,
  Edit2,
  Trash2,
  Download,
  Upload,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type RegulatoryRegion = 'US' | 'EU' | 'JP' | 'CA' | 'AU' | 'CH' | 'MULTI';

interface SubmissionTemplate {
  id: string;
  name: string;
  region: RegulatoryRegion;
  submissionType: string;
  category: 'original' | 'supplement' | 'variation' | 'response' | 'report';
  description: string;
  documentCount: number;
  requiredSections: string[];
  optionalSections: string[];
  isSystem: boolean;
  isFavorite: boolean;
  usageCount: number;
  lastUsed?: string;
  aiEnabled?: boolean;
  tags: string[];
}

// =============================================================================
// MOCK DATA
// =============================================================================

const REGION_CONFIG: Record<RegulatoryRegion, { flag: string; name: string; color: string }> = {
  US: { flag: '🇺🇸', name: 'FDA', color: 'text-blue-400 bg-blue-500/20' },
  EU: { flag: '🇪🇺', name: 'EMA', color: 'text-purple-400 bg-purple-500/20' },
  JP: { flag: '🇯🇵', name: 'PMDA', color: 'text-pink-400 bg-pink-500/20' },
  CA: { flag: '🇨🇦', name: 'Health Canada', color: 'text-red-400 bg-red-500/20' },
  AU: { flag: '🇦🇺', name: 'TGA', color: 'text-emerald-400 bg-emerald-500/20' },
  CH: { flag: '🇨🇭', name: 'Swissmedic', color: 'text-amber-400 bg-amber-500/20' },
  MULTI: { flag: '🌐', name: 'Multi-Region', color: 'text-cyan-400 bg-cyan-500/20' },
};

const CATEGORY_CONFIG = {
  original: { label: 'Original', color: 'text-green-400 bg-green-500/20' },
  supplement: { label: 'Supplement', color: 'text-blue-400 bg-blue-500/20' },
  variation: { label: 'Variation', color: 'text-purple-400 bg-purple-500/20' },
  response: { label: 'Response', color: 'text-amber-400 bg-amber-500/20' },
  report: { label: 'Report', color: 'text-slate-400 bg-slate-500/20' },
};

const MOCK_TEMPLATES: SubmissionTemplate[] = [
  // FDA Templates
  {
    id: 'fda-nda-original',
    name: 'NDA Original Application',
    region: 'US',
    submissionType: 'NDA',
    category: 'original',
    description: 'Complete NDA with all 5 modules, Form 356h, SPL labeling',
    documentCount: 45,
    requiredSections: ['1.1', '1.2', '1.12', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '3.2.S', '3.2.P'],
    optionalSections: ['1.14', '1.15', '1.16'],
    isSystem: true,
    isFavorite: true,
    usageCount: 24,
    lastUsed: '2025-01-28',
    aiEnabled: true,
    tags: ['NDA', 'full', 'complete'],
  },
  {
    id: 'fda-nda-supplement-cbe30',
    name: 'NDA Supplement (CBE-30)',
    region: 'US',
    submissionType: 'sNDA',
    category: 'supplement',
    description: 'Changes Being Effected in 30 Days - CMC changes',
    documentCount: 12,
    requiredSections: ['1.1', '1.2', '2.3', '3.2.P'],
    optionalSections: ['1.12'],
    isSystem: true,
    isFavorite: false,
    usageCount: 18,
    lastUsed: '2025-01-25',
    tags: ['sNDA', 'CMC', 'supplement'],
  },
  {
    id: 'fda-ir-response',
    name: 'IR Response',
    region: 'US',
    submissionType: 'IR-Response',
    category: 'response',
    description: 'Information Request response with cover letter',
    documentCount: 8,
    requiredSections: ['1.2'],
    optionalSections: [],
    isSystem: true,
    isFavorite: true,
    usageCount: 42,
    lastUsed: '2025-01-29',
    aiEnabled: true,
    tags: ['IR', 'HAQ', 'response'],
  },
  {
    id: 'fda-annual-report',
    name: 'IND Annual Report',
    region: 'US',
    submissionType: 'Annual-Report',
    category: 'report',
    description: 'Annual IND safety and progress report',
    documentCount: 6,
    requiredSections: ['1.1', '1.2'],
    optionalSections: [],
    isSystem: true,
    isFavorite: false,
    usageCount: 8,
    tags: ['annual', 'IND', 'safety'],
  },
  // EMA Templates
  {
    id: 'ema-maa-centralized',
    name: 'MAA Centralized Procedure',
    region: 'EU',
    submissionType: 'MAA',
    category: 'original',
    description: 'Marketing Authorization Application via centralized procedure',
    documentCount: 52,
    requiredSections: ['1.0', '1.2', '1.3', '1.5', '1.6', '1.8', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7'],
    optionalSections: ['1.4', '1.7'],
    isSystem: true,
    isFavorite: false,
    usageCount: 6,
    lastUsed: '2025-01-15',
    tags: ['MAA', 'centralized', 'EU'],
  },
  {
    id: 'ema-type-ii-variation',
    name: 'Type II Variation',
    region: 'EU',
    submissionType: 'Type-II',
    category: 'variation',
    description: 'Major variation requiring assessment',
    documentCount: 15,
    requiredSections: ['1.2', '1.3'],
    optionalSections: [],
    isSystem: true,
    isFavorite: false,
    usageCount: 12,
    tags: ['variation', 'Type II'],
  },
  {
    id: 'ema-psur',
    name: 'PSUR (eSubmission)',
    region: 'EU',
    submissionType: 'PSUR',
    category: 'report',
    description: 'Periodic Safety Update Report',
    documentCount: 10,
    requiredSections: ['1.2'],
    optionalSections: [],
    isSystem: true,
    isFavorite: true,
    usageCount: 20,
    lastUsed: '2025-01-20',
    tags: ['PSUR', 'safety', 'periodic'],
  },
  // Multi-Region
  {
    id: 'multi-global-nda-maa',
    name: 'Global NDA/MAA Parallel',
    region: 'MULTI',
    submissionType: 'NDA/MAA',
    category: 'original',
    description: 'Simultaneous US NDA + EU MAA from shared content',
    documentCount: 60,
    requiredSections: ['2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '3.2.S', '3.2.P'],
    optionalSections: [],
    isSystem: true,
    isFavorite: true,
    usageCount: 3,
    aiEnabled: true,
    tags: ['global', 'parallel', 'US', 'EU'],
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

function RegionBadge({ region }: { region: RegulatoryRegion }) {
  const config = REGION_CONFIG[region];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''}`}>
      <span>{config.flag}</span>
      <span>{config.name}</span>
    </span>
  );
}

function CategoryBadge({ category }: { category: SubmissionTemplate['category'] }) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''}`}>
      {config.label}
    </span>
  );
}

function TemplateCard({
  template,
  onUse,
  onToggleFavorite,
  onPreview,
}: {
  template: SubmissionTemplate;
  onUse: () => void;
  onToggleFavorite: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="bg-surface-card border border-border rounded-lg p-4 hover:border-accent-blue/50 hover:shadow-lg transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <RegionBadge region={template.region} />
            <CategoryBadge category={template.category} />
            {template.aiEnabled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-accent-purple bg-accent-purple/20">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            )}
          </div>
          <h3 className="font-semibold text-text-primary text-sm">{template.name}</h3>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`p-1 rounded transition-colors ${
            template.isFavorite 
              ? 'text-amber-400' 
              : 'text-text-muted hover:text-amber-400 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Star className={`w-4 h-4 ${template.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-text-muted mb-3 line-clamp-2">{template.description}</p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {template.documentCount} docs
        </span>
        <span className="flex items-center gap-1">
          <Folder className="w-3 h-3" />
          {template.requiredSections.length} sections
        </span>
        {template.lastUsed && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.usageCount}× used
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUse}
          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-accent-blue rounded hover:bg-accent-blue/90 transition-colors flex items-center justify-center gap-1"
        >
          Use Template
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onPreview}
          className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-elevated rounded transition-colors"
        >
          Preview
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TemplateLibraryPanel({
  onSelectTemplate,
  onClose,
}: {
  onSelectTemplate?: (template: SubmissionTemplate) => void;
  onClose?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegulatoryRegion | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<SubmissionTemplate['category'] | 'all'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (showFavoritesOnly && !t.isFavorite) return false;
      if (selectedRegion !== 'all' && t.region !== selectedRegion) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [templates, searchQuery, selectedRegion, selectedCategory, showFavoritesOnly]);

  // Group by region
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, SubmissionTemplate[]> = {};
    filteredTemplates.forEach(t => {
      const key = t.region;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  const handleToggleFavorite = (id: string) => {
    setTemplates(prev =>
      prev.map(t => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const handleUseTemplate = (template: SubmissionTemplate) => {
    onSelectTemplate?.(template);
  };

  return (
    <div className="h-full flex flex-col bg-surface-elevated">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/20 rounded-lg">
              <FileText className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Submission Templates</h2>
              <p className="text-xs text-text-muted">{templates.length} templates available</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-card rounded-lg border border-border flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button className="px-3 py-1.5 text-sm text-white bg-accent-blue hover:bg-accent-blue/90 rounded-lg flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value as RegulatoryRegion | 'all')}
            className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Regions</option>
            {Object.entries(REGION_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.flag} {config.name}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as SubmissionTemplate['category'] | 'all')}
            className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Types</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* Favorites Toggle */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-1 transition-colors ${
              showFavoritesOnly
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'bg-surface-card border-border text-text-secondary hover:border-amber-500/50'
            }`}
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Favorites
          </button>
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No templates found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : selectedRegion === 'all' ? (
          // Grouped by region
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([region, regionTemplates]) => (
              <div key={region}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{REGION_CONFIG[region as RegulatoryRegion].flag}</span>
                  <h3 className="font-semibold text-text-primary">
                    {REGION_CONFIG[region as RegulatoryRegion].name}
                  </h3>
                  <span className="text-xs text-text-muted">({regionTemplates.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regionTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onUse={() => handleUseTemplate(template)}
                      onToggleFavorite={() => handleToggleFavorite(template.id)}
                      onPreview={() => {}}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Flat grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={() => handleUseTemplate(template)}
                onToggleFavorite={() => handleToggleFavorite(template.id)}
                onPreview={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-border bg-surface-card">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Showing {filteredTemplates.length} of {templates.length} templates
          </span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-current" />
              {templates.filter(t => t.isFavorite).length} favorites
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent-purple" />
              {templates.filter(t => t.aiEnabled).length} AI-enabled
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default TemplateLibraryPanel;
