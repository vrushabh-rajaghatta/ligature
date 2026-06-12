// =============================================================================
// TEMPLATE BROWSER - v0.42.13
// Comprehensive eCTD document template browser with category filtering,
// guidance reference search, and usage analytics
// 🎯 200 TEMPLATES - Phase 3 Milestone Complete (+13 templates)
// =============================================================================


import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  Clock,
  Star,
  ChevronRight,
  ChevronDown,
  BarChart3,
  BookOpen,
  Beaker,
  Stethoscope,
  PenTool,
  Shield,
  FlaskConical,
  TestTube,
  Globe,
  Building2,
  FileCheck,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Copy,
  Eye,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Info,
  Target,
  ClipboardCheck,
  Scale,
  Baby,
  Heart,
  Zap,
  Pill,
  AlertTriangle,
  GitCompare,
  FilePlus,
  Dna,
  Monitor,
  Syringe,
  Activity,
  Cpu,
  Microscope,
} from 'lucide-react';

import {
  ECTD_DOCUMENT_TEMPLATES,
  BIOTECH_CMC_TEMPLATES,
  CLINICAL_TRIAL_TEMPLATES,
  MEDICAL_WRITING_TEMPLATES,
  CLINICAL_OPERATIONS_TEMPLATES,
  CMC_QUALITY_TEMPLATES,
  ADDITIONAL_CMC_TEMPLATES,
  NONCLINICAL_TEMPLATES,
  NONCLINICAL_GLP_TEMPLATES,
  POST_MARKETING_TEMPLATES,
  FDA_MODULE1_TEMPLATES,
  EMA_MODULE1_TEMPLATES,
  PMDA_MODULE1_TEMPLATES,
  HC_MODULE1_TEMPLATES,
  MHRA_MODULE1_TEMPLATES,
  REGULATORY_STRATEGY_TEMPLATES,
  AUDIT_INSPECTION_TEMPLATES,
  COMPLIANCE_TEMPLATES,
  // Phase 3 Final templates (200 milestone)
  PEDIATRIC_TEMPLATES,
  ORPHAN_DRUG_TEMPLATES,
  EXPEDITED_PROGRAM_TEMPLATES,
  PSMF_TEMPLATES,
  REMS_TEMPLATES,
  COMPARABILITY_TEMPLATES,
  POST_APPROVAL_CHANGE_TEMPLATES,
  BIOSIMILAR_TEMPLATES,
  // Phase 3 Milestone (200 templates!)
  DEVICE_COMBINATION_TEMPLATES,
  ADVANCED_THERAPY_TEMPLATES,
  RWE_TEMPLATES,
  DIGITAL_HEALTH_TEMPLATES,
  VACCINE_BIOLOGIC_TEMPLATES,
  type DocumentTemplate,
} from '@/data/ectd-document-templates';

// =============================================================================
// TYPES
// =============================================================================

interface TemplateCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  templates: DocumentTemplate[];
  color: string;
  isNew?: boolean;
}

interface GuidanceReference {
  id: string;
  name: string;
  fullName: string;
  category: 'ICH' | 'FDA' | 'EMA' | 'USP' | 'Other';
  templateCount: number;
}

interface UsageStats {
  totalTemplates: number;
  totalEstimatedHours: number;
  byCategory: { category: string; count: number; hours: number }[];
  byRegion: { region: string; count: number }[];
  byGuidance: { guidance: string; count: number }[];
  topUsed: { id: string; name: string; usageCount: number }[];
  recentlyAdded: DocumentTemplate[];
}

type ViewMode = 'grid' | 'list' | 'analytics';
type SortOption = 'name' | 'module' | 'hours' | 'recent';

// =============================================================================
// CATEGORIES
// =============================================================================

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'all',
    name: 'All Templates',
    icon: FileText,
    description: 'Browse all 200 document templates',
    templates: ECTD_DOCUMENT_TEMPLATES,
    color: 'text-slate-400',
  },
  {
    id: 'device-combo',
    name: 'Device & Combination',
    icon: Cpu,
    description: '510(k), PMA Supplements, Combination Products',
    templates: DEVICE_COMBINATION_TEMPLATES,
    color: 'text-indigo-400',
    isNew: true,
  },
  {
    id: 'advanced-therapy',
    name: 'Advanced Therapies',
    icon: Microscope,
    description: 'Cell Therapy, Gene Therapy, ATMP',
    templates: ADVANCED_THERAPY_TEMPLATES,
    color: 'text-fuchsia-400',
    isNew: true,
  },
  {
    id: 'rwe',
    name: 'Real-World Evidence',
    icon: Activity,
    description: 'RWE Protocols, Registry Studies, Claims Analysis',
    templates: RWE_TEMPLATES,
    color: 'text-emerald-400',
    isNew: true,
  },
  {
    id: 'digital-health',
    name: 'Digital Health',
    icon: Monitor,
    description: 'SaMD, Digital Pre-Submissions',
    templates: DIGITAL_HEALTH_TEMPLATES,
    color: 'text-blue-400',
    isNew: true,
  },
  {
    id: 'vaccine-bio',
    name: 'Vaccines & Biologics',
    icon: Syringe,
    description: 'Lot Release, BPDR',
    templates: VACCINE_BIOLOGIC_TEMPLATES,
    color: 'text-amber-400',
    isNew: true,
  },
  {
    id: 'pediatric',
    name: 'Pediatric (PIP/PSP)',
    icon: Baby,
    description: 'PIP, PSP, Written Request templates',
    templates: PEDIATRIC_TEMPLATES,
    color: 'text-pink-400',
  },
  {
    id: 'orphan',
    name: 'Orphan Drug',
    icon: Heart,
    description: 'FDA/EMA orphan drug designations',
    templates: ORPHAN_DRUG_TEMPLATES,
    color: 'text-red-400',
  },
  {
    id: 'expedited',
    name: 'Expedited Programs',
    icon: Zap,
    description: 'Fast Track, Breakthrough, PRIME',
    templates: EXPEDITED_PROGRAM_TEMPLATES,
    color: 'text-yellow-400',
  },
  {
    id: 'rems-psmf',
    name: 'REMS & PSMF',
    icon: AlertTriangle,
    description: 'REMS, Medication Guides, PSMF',
    templates: [...REMS_TEMPLATES, ...PSMF_TEMPLATES],
    color: 'text-orange-500',
  },
  {
    id: 'comparability',
    name: 'Comparability',
    icon: GitCompare,
    description: 'Comparability protocols, biosimilar analysis',
    templates: COMPARABILITY_TEMPLATES,
    color: 'text-cyan-500',
  },
  {
    id: 'post-approval',
    name: 'Post-Approval Changes',
    icon: FilePlus,
    description: 'CBE, PAS, Annual Reports',
    templates: POST_APPROVAL_CHANGE_TEMPLATES,
    color: 'text-green-500',
  },
  {
    id: 'biosimilar',
    name: 'Biosimilar Development',
    icon: Dna,
    description: 'Biosimilar plans, 351(k) strategies',
    templates: BIOSIMILAR_TEMPLATES,
    color: 'text-violet-500',
  },
  {
    id: 'reg-strategy',
    name: 'Regulatory Strategy',
    icon: Target,
    description: 'Global strategy, FDA meetings, EMA advice',
    templates: REGULATORY_STRATEGY_TEMPLATES,
    color: 'text-teal-400',
  },
  {
    id: 'audit-inspection',
    name: 'Audits & Inspections',
    icon: ClipboardCheck,
    description: 'GCP/GMP/GLP audits, inspection readiness',
    templates: AUDIT_INSPECTION_TEMPLATES,
    color: 'text-sky-400',
  },
  {
    id: 'compliance',
    name: 'Compliance & QMS',
    icon: Scale,
    description: 'Deviations, CAPA, change control, quality',
    templates: COMPLIANCE_TEMPLATES,
    color: 'text-lime-400',
  },
  {
    id: 'biotech-cmc',
    name: 'Biotech & Sterile CMC',
    icon: FlaskConical,
    description: 'Biologics, biosimilars, sterile manufacturing',
    templates: BIOTECH_CMC_TEMPLATES,
    color: 'text-purple-400',
  },
  {
    id: 'clinical-trial',
    name: 'Clinical Trial Operations',
    icon: Stethoscope,
    description: 'Monitoring, data management, GCP compliance',
    templates: CLINICAL_TRIAL_TEMPLATES,
    color: 'text-blue-400',
  },
  {
    id: 'medical-writing',
    name: 'Medical Writing',
    icon: PenTool,
    description: 'Regulatory submissions, briefing documents',
    templates: MEDICAL_WRITING_TEMPLATES,
    color: 'text-emerald-400',
  },
  {
    id: 'clinical-ops',
    name: 'Clinical Operations',
    icon: Users,
    description: 'Protocol, ICF, IB templates',
    templates: CLINICAL_OPERATIONS_TEMPLATES,
    color: 'text-cyan-400',
  },
  {
    id: 'cmc-quality',
    name: 'CMC & Quality',
    icon: Beaker,
    description: 'Drug substance, drug product, specifications',
    templates: [...CMC_QUALITY_TEMPLATES, ...ADDITIONAL_CMC_TEMPLATES],
    color: 'text-amber-400',
  },
  {
    id: 'nonclinical',
    name: 'Nonclinical & GLP',
    icon: TestTube,
    description: 'Pharmacology, toxicology, ADME studies',
    templates: [...NONCLINICAL_TEMPLATES, ...NONCLINICAL_GLP_TEMPLATES],
    color: 'text-rose-400',
  },
  {
    id: 'post-marketing',
    name: 'Post-Marketing',
    icon: Shield,
    description: 'PSUR, RMP, variations, renewals',
    templates: POST_MARKETING_TEMPLATES,
    color: 'text-orange-400',
  },
  {
    id: 'module1-fda',
    name: 'Module 1 - FDA',
    icon: Building2,
    description: 'US regional administrative documents',
    templates: FDA_MODULE1_TEMPLATES,
    color: 'text-blue-500',
  },
  {
    id: 'module1-ema',
    name: 'Module 1 - EMA',
    icon: Globe,
    description: 'EU regional administrative documents',
    templates: EMA_MODULE1_TEMPLATES,
    color: 'text-indigo-400',
  },
  {
    id: 'module1-other',
    name: 'Module 1 - Other Regions',
    icon: Globe,
    description: 'PMDA, Health Canada, MHRA',
    templates: [...PMDA_MODULE1_TEMPLATES, ...HC_MODULE1_TEMPLATES, ...MHRA_MODULE1_TEMPLATES],
    color: 'text-violet-400',
  },
];

// =============================================================================
// GUIDANCE REFERENCES
// =============================================================================

const extractGuidanceReferences = (templates: DocumentTemplate[]): GuidanceReference[] => {
  const guidanceMap = new Map<string, { fullName: string; category: string; count: number }>();
  
  templates.forEach(t => {
    if (t.ichGuideline) {
      // Parse multiple guidelines separated by /
      const guidelines = t.ichGuideline.split('/').map(g => g.trim());
      guidelines.forEach(g => {
        // Extract short reference
        const shortRef = g.match(/ICH [A-Z]\d+(\([A-Z]\d*\))?|FDA [A-Za-z ]+|EMA [A-Za-z ]+|USP <?\d+>?|PQRI|CDISC|GLP/)?.[0] || g;
        const category = g.startsWith('ICH') ? 'ICH' : 
                        g.startsWith('FDA') ? 'FDA' : 
                        g.startsWith('EMA') ? 'EMA' : 
                        g.startsWith('USP') ? 'USP' : 'Other';
        
        const existing = guidanceMap.get(shortRef);
        if (existing) {
          existing.count++;
        } else {
          guidanceMap.set(shortRef, { fullName: g, category, count: 1 });
        }
      });
    }
  });

  return Array.from(guidanceMap.entries())
    .map(([id, data]) => ({
      id,
      name: id,
      fullName: data.fullName,
      category: data.category as GuidanceReference['category'],
      templateCount: data.count,
    }))
    .sort((a, b) => b.templateCount - a.templateCount);
};

// =============================================================================
// ANALYTICS CALCULATOR
// =============================================================================

const calculateUsageStats = (templates: DocumentTemplate[]): UsageStats => {
  const totalEstimatedHours = templates.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  
  // By category
  const categoryMap = new Map<string, { count: number; hours: number }>();
  TEMPLATE_CATEGORIES.slice(1).forEach(cat => {
    categoryMap.set(cat.name, {
      count: cat.templates.length,
      hours: cat.templates.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
    });
  });
  
  // By region
  const regionMap = new Map<string, number>();
  templates.forEach(t => {
    t.applicableRegions?.forEach(r => {
      regionMap.set(r, (regionMap.get(r) || 0) + 1);
    });
  });
  
  // By guidance
  const guidanceMap = new Map<string, number>();
  templates.forEach(t => {
    if (t.ichGuideline) {
      const shortRef = t.ichGuideline.split('/')[0].trim();
      guidanceMap.set(shortRef, (guidanceMap.get(shortRef) || 0) + 1);
    }
  });
  
  // Top used (mock data - in production this would come from actual usage tracking)
  const topUsed = templates
    .filter(t => t.usageCount && t.usageCount > 0)
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 10)
    .map(t => ({ id: t.id, name: t.name, usageCount: t.usageCount || 0 }));
  
  // Recently added (Phase 2 templates)
  const recentlyAdded = [
    ...BIOTECH_CMC_TEMPLATES,
    ...CLINICAL_TRIAL_TEMPLATES,
    ...MEDICAL_WRITING_TEMPLATES,
  ].slice(0, 10);

  return {
    totalTemplates: templates.length,
    totalEstimatedHours,
    byCategory: Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      hours: data.hours,
    })),
    byRegion: Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count),
    byGuidance: Array.from(guidanceMap.entries())
      .map(([guidance, count]) => ({ guidance, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    topUsed,
    recentlyAdded,
  };
};

// =============================================================================
// COMPONENTS
// =============================================================================

interface TemplateBrowserProps {
  onSelectTemplate?: (template: DocumentTemplate) => void;
  onCreateDocument?: (template: DocumentTemplate) => void;
  compact?: boolean;
}

export function TemplateBrowser({ 
  onSelectTemplate, 
  onCreateDocument,
  compact = false,
}: TemplateBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuidance, setSelectedGuidance] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Get current category
  const currentCategory = useMemo(() => 
    TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory) || TEMPLATE_CATEGORIES[0],
    [selectedCategory]
  );

  // Extract guidance references
  const guidanceRefs = useMemo(() => 
    extractGuidanceReferences(ECTD_DOCUMENT_TEMPLATES),
    []
  );

  // Calculate analytics
  const usageStats = useMemo(() => 
    calculateUsageStats(ECTD_DOCUMENT_TEMPLATES),
    []
  );

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = currentCategory.templates;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.ichGuideline?.toLowerCase().includes(query) ||
        t.ctdModule?.toLowerCase().includes(query)
      );
    }

    // Guidance filter
    if (selectedGuidance) {
      templates = templates.filter(t =>
        t.ichGuideline?.includes(selectedGuidance)
      );
    }

    // Region filter
    if (selectedRegion) {
      templates = templates.filter(t =>
        t.applicableRegions?.includes(selectedRegion)
      );
    }

    // Sort
    switch (sortBy) {
      case 'module':
        templates = [...templates].sort((a, b) => 
          (a.ctdModule || '').localeCompare(b.ctdModule || '')
        );
        break;
      case 'hours':
        templates = [...templates].sort((a, b) => 
          (b.estimatedHours || 0) - (a.estimatedHours || 0)
        );
        break;
      case 'recent':
        // Phase 2 templates first
        const phase2Ids = new Set([
          ...BIOTECH_CMC_TEMPLATES.map(t => t.id),
          ...CLINICAL_TRIAL_TEMPLATES.map(t => t.id),
          ...MEDICAL_WRITING_TEMPLATES.map(t => t.id),
        ]);
        templates = [...templates].sort((a, b) => {
          const aNew = phase2Ids.has(a.id) ? 1 : 0;
          const bNew = phase2Ids.has(b.id) ? 1 : 0;
          return bNew - aNew;
        });
        break;
      default:
        templates = [...templates].sort((a, b) => a.name.localeCompare(b.name));
    }

    return templates;
  }, [currentCategory, searchQuery, selectedGuidance, selectedRegion, sortBy]);

  // Unique regions for filter
  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    ECTD_DOCUMENT_TEMPLATES.forEach(t => {
      t.applicableRegions?.forEach(r => regions.add(r));
    });
    return Array.from(regions).sort();
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedGuidance(null);
    setSelectedRegion(null);
  }, []);

  const hasActiveFilters = searchQuery || selectedGuidance || selectedRegion;

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${compact ? '' : 'rounded-lg border border-slate-700'}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Template Library
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                {ECTD_DOCUMENT_TEMPLATES.length} templates
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              ICH CTD-compliant document templates with AI assistance
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'analytics' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search templates, guidance references, CTD modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
            )}
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="name">Sort: Name</option>
            <option value="module">Sort: CTD Module</option>
            <option value="hours">Sort: Est. Hours</option>
            <option value="recent">Sort: Recently Added</option>
          </select>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Filter Options</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Guidance Reference Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Guidance Reference</label>
                <select
                  value={selectedGuidance || ''}
                  onChange={(e) => setSelectedGuidance(e.target.value || null)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Guidelines</option>
                  <optgroup label="ICH Guidelines">
                    {guidanceRefs.filter(g => g.category === 'ICH').map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.templateCount})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="FDA Guidelines">
                    {guidanceRefs.filter(g => g.category === 'FDA').map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.templateCount})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    {guidanceRefs.filter(g => !['ICH', 'FDA'].includes(g.category)).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.templateCount})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Region Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Applicable Region</label>
                <select
                  value={selectedRegion || ''}
                  onChange={(e) => setSelectedRegion(e.target.value || null)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Regions</option>
                  {availableRegions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-slate-700 overflow-y-auto">
          <div className="p-2">
            {TEMPLATE_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-500/20 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <category.icon className={`w-4 h-4 ${category?.color ?? ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {category.name}
                    {category.isNew && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {category.templates.length} templates
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Template List / Analytics */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'analytics' ? (
            <AnalyticsDashboard stats={usageStats} guidanceRefs={guidanceRefs} />
          ) : (
            <>
              {/* Results Summary */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Showing {filteredTemplates.length} of {currentCategory.templates.length} templates
                  {hasActiveFilters && ' (filtered)'}
                </span>
              </div>

              {/* Template Grid/List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 gap-4">
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isExpanded={expandedTemplate === template.id}
                      onToggleExpand={() => setExpandedTemplate(
                        expandedTemplate === template.id ? null : template.id
                      )}
                      onSelect={() => onSelectTemplate?.(template)}
                      onCreate={() => onCreateDocument?.(template)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map(template => (
                    <TemplateListItem
                      key={template.id}
                      template={template}
                      onSelect={() => onSelectTemplate?.(template)}
                      onCreate={() => onCreateDocument?.(template)}
                    />
                  ))}
                </div>
              )}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Try adjusting your search or filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TEMPLATE CARD
// =============================================================================

interface TemplateCardProps {
  template: DocumentTemplate;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect?: () => void;
  onCreate?: () => void;
}

function TemplateCard({ template, isExpanded, onToggleExpand, onSelect, onCreate }: TemplateCardProps) {
  const isPhase2 = [
    ...BIOTECH_CMC_TEMPLATES,
    ...CLINICAL_TRIAL_TEMPLATES,
    ...MEDICAL_WRITING_TEMPLATES,
  ].some(t => t.id === template.id);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm truncate flex items-center gap-2">
              {template.name}
              {isPhase2 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex-shrink-0">
                  NEW
                </span>
              )}
            </h3>
            {template.ctdModule && (
              <span className="text-xs text-blue-400 font-mono">
                Module {template.ctdModule}
              </span>
            )}
          </div>
          <button
            onClick={onToggleExpand}
            className="p-1 text-slate-500 hover:text-white rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
          {template.description}
        </p>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {template.ichGuideline && (
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
              {template.ichGuideline.split('/')[0].trim()}
            </span>
          )}
          {template.estimatedHours && (
            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.estimatedHours}h
            </span>
          )}
          {template.applicableRegions?.slice(0, 3).map(r => (
            <span key={r} className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
              {r}
            </span>
          ))}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-400 mb-2">
              <strong>Sections:</strong> {template.sections.length}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {template.sections.slice(0, 5).map(section => (
                <div key={section.id} className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="font-mono text-slate-600">{section.number}</span>
                  <span className="truncate">{section.title}</span>
                  {section.aiPrompt && (
                    <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  )}
                </div>
              ))}
              {template.sections.length > 5 && (
                <div className="text-xs text-slate-600">
                  +{template.sections.length - 5} more sections
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onSelect}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
          <button
            onClick={onCreate}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
          >
            <FileText className="w-3 h-3" />
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TEMPLATE LIST ITEM
// =============================================================================

interface TemplateListItemProps {
  template: DocumentTemplate;
  onSelect?: () => void;
  onCreate?: () => void;
}

function TemplateListItem({ template, onSelect, onCreate }: TemplateListItemProps) {
  const isPhase2 = [
    ...BIOTECH_CMC_TEMPLATES,
    ...CLINICAL_TRIAL_TEMPLATES,
    ...MEDICAL_WRITING_TEMPLATES,
  ].some(t => t.id === template.id);

  return (
    <div className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex-shrink-0">
        <FileText className="w-8 h-8 text-slate-500" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white text-sm truncate">
            {template.name}
          </h3>
          {isPhase2 && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
              NEW
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {template.ctdModule && (
            <span className="text-xs text-blue-400 font-mono">
              {template.ctdModule}
            </span>
          )}
          {template.ichGuideline && (
            <span className="text-xs text-purple-400">
              {template.ichGuideline.split('/')[0].trim()}
            </span>
          )}
          {template.estimatedHours && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.estimatedHours}h
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {template.applicableRegions?.slice(0, 3).map(r => (
          <span key={r} className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
            {r}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSelect}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Preview"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onCreate}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ANALYTICS DASHBOARD
// =============================================================================

interface AnalyticsDashboardProps {
  stats: UsageStats;
  guidanceRefs: GuidanceReference[];
}

function AnalyticsDashboard({ stats, guidanceRefs }: AnalyticsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-white">{stats.totalTemplates}</div>
          <div className="text-sm text-slate-400">Total Templates</div>
          <div className="text-xs text-emerald-400 mt-1">+30 in Phase 2</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-white">{stats.totalEstimatedHours.toLocaleString()}</div>
          <div className="text-sm text-slate-400">Total Est. Hours</div>
          <div className="text-xs text-slate-500 mt-1">If written manually</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-white">{guidanceRefs.length}</div>
          <div className="text-sm text-slate-400">Guidance References</div>
          <div className="text-xs text-slate-500 mt-1">ICH, FDA, EMA, USP</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-white">{stats.byRegion.length}</div>
          <div className="text-sm text-slate-400">Regions Covered</div>
          <div className="text-xs text-slate-500 mt-1">Global compliance</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          Templates by Category
        </h3>
        <div className="space-y-3">
          {stats.byCategory.map(cat => {
            const maxCount = Math.max(...stats.byCategory.map(c => c.count));
            const percentage = (cat.count / maxCount) * 100;
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-300">{cat.category}</span>
                  <span className="text-slate-400">
                    {cat.count} templates · {cat.hours}h
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Region Distribution */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Regional Coverage
          </h3>
          <div className="space-y-2">
            {stats.byRegion.slice(0, 8).map(({ region, count }) => (
              <div key={region} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{region}</span>
                <span className="text-sm text-slate-500">{count} templates</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Guidance References */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            Top Guidance References
          </h3>
          <div className="space-y-2">
            {stats.byGuidance.slice(0, 8).map(({ guidance, count }) => (
              <div key={guidance} className="flex items-center justify-between">
                <span className="text-sm text-slate-300 truncate">{guidance}</span>
                <span className="text-sm text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recently Added */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Recently Added (Phase 2)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {stats.recentlyAdded.map(template => (
            <div
              key={template.id}
              className="flex items-center gap-2 p-2 bg-slate-700/50 rounded text-sm"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-slate-300 truncate">{template.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Competitive Positioning */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30 p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Competitive Position
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-lg font-bold text-emerald-400">+11%</div>
            <div className="text-xs text-slate-400">vs Certara (150)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400">+66%</div>
            <div className="text-xs text-slate-400">vs Celegence (~100)</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-400">Phase 3</div>
            <div className="text-xs text-slate-400">200+ target</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateBrowser;
