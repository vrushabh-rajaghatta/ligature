

import { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  X,
  FileText,
  Building2,
  Target,
  Layers,
  ClipboardCheck,
  Sparkles,
  AlertCircle,
  Globe,
  Calendar,
  User,
  Package,
  Loader2,
  RefreshCw,
  Database
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useProducts } from '@/stores/products-store';
import type { Product } from '@/types/core';
import { useToast } from '@/components/ui/Toast';
import { applicationsApi, SequenceInfo, Application as APIApplication } from '@/lib/applications-api';

// ============================================================================
// TYPES
// ============================================================================

export type SubmissionTypeOption = 'IND' | 'NDA' | 'BLA' | 'MAA' | 'sNDA' | 'sBLA' | 'JNDA' | 'NDS' | 'CTA';
export type RegionOption = 'US' | 'EU' | 'Japan' | 'China' | 'Canada' | 'Global';
export type AgencyOption = 'FDA' | 'EMA' | 'PMDA' | 'NMPA' | 'Health Canada';

interface WizardData {
  // Step 1: Submission Type
  submissionType: SubmissionTypeOption | null;
  isOriginal: boolean;
  
  // Step 2: Product Selection
  productId: string | null;
  indication: string;
  
  // Step 3: Health Authority
  region: RegionOption | null;
  agency: AgencyOption | null;
  applicationNumber: string;
  sequenceNumber: string;
  existingApplicationId: string | null;  // v0.13.33: Link to existing application
  
  // Step 4: Module Requirements
  selectedModules: string[];
  expeditedDesignation: string | null;
  
  // Step 5: Review - computed from above
}

interface NewSubmissionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: WizardData) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SUBMISSION_TYPES: { value: SubmissionTypeOption; label: string; description: string; icon: string; regions: RegionOption[] }[] = [
  { value: 'IND', label: 'IND', description: 'Investigational New Drug Application', icon: '🔬', regions: ['US'] },
  { value: 'NDA', label: 'NDA', description: 'New Drug Application (Small Molecule)', icon: '💊', regions: ['US'] },
  { value: 'BLA', label: 'BLA', description: 'Biologics License Application', icon: '🧬', regions: ['US'] },
  { value: 'sNDA', label: 'sNDA', description: 'Supplemental NDA', icon: '📋', regions: ['US'] },
  { value: 'sBLA', label: 'sBLA', description: 'Supplemental BLA', icon: '📋', regions: ['US'] },
  { value: 'MAA', label: 'MAA', description: 'Marketing Authorisation Application', icon: '🇪🇺', regions: ['EU'] },
  { value: 'CTA', label: 'CTA', description: 'Clinical Trial Application', icon: '🔬', regions: ['EU'] },
  { value: 'JNDA', label: 'JNDA', description: 'Japan New Drug Application', icon: '🇯🇵', regions: ['Japan'] },
  { value: 'NDS', label: 'NDS', description: 'New Drug Submission (Canada)', icon: '🇨🇦', regions: ['Canada'] },
];

const REGIONS: { value: RegionOption; label: string; agency: AgencyOption; flag: string }[] = [
  { value: 'US', label: 'United States', agency: 'FDA', flag: '🇺🇸' },
  { value: 'EU', label: 'European Union', agency: 'EMA', flag: '🇪🇺' },
  { value: 'Japan', label: 'Japan', agency: 'PMDA', flag: '🇯🇵' },
  { value: 'China', label: 'China', agency: 'NMPA', flag: '🇨🇳' },
  { value: 'Canada', label: 'Canada', agency: 'Health Canada', flag: '🇨🇦' },
];

const MODULE_REQUIREMENTS = [
  { id: 'm1', number: '1', name: 'Administrative Information', required: true, description: 'Forms, cover letters, regional info' },
  { id: 'm2', number: '2', name: 'CTD Summaries', required: true, description: 'Quality, nonclinical, clinical overviews' },
  { id: 'm3', number: '3', name: 'Quality (CMC)', required: true, description: 'Drug substance & product information' },
  { id: 'm4', number: '4', name: 'Nonclinical', required: true, description: 'Pharmacology, PK, toxicology studies' },
  { id: 'm5', number: '5', name: 'Clinical', required: true, description: 'Clinical study reports & analyses' },
];

const EXPEDITED_DESIGNATIONS = [
  { value: 'breakthrough', label: 'Breakthrough Therapy', description: 'Serious condition with preliminary clinical evidence' },
  { value: 'fast-track', label: 'Fast Track', description: 'Serious condition and unmet medical need' },
  { value: 'accelerated', label: 'Accelerated Approval', description: 'Based on surrogate or intermediate endpoint' },
  { value: 'priority', label: 'Priority Review', description: 'Significant improvement over existing therapies' },
  { value: 'rmat', label: 'RMAT', description: 'Regenerative Medicine Advanced Therapy' },
  { value: 'none', label: 'Standard Review', description: 'No expedited designation' },
];

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  products: Product[];
}

function Step1SubmissionType({ data, updateData }: StepProps) {
  const filteredTypes = useMemo(() => {
    if (!data.region) return SUBMISSION_TYPES;
    return SUBMISSION_TYPES.filter(t => t.regions.includes(data.region!));
  }, [data.region]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">Select Submission Type</h3>
        <div className="grid grid-cols-3 gap-3">
          {filteredTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => updateData({ submissionType: type.value, isOriginal: !type.value.startsWith('s') })}
              className={`
                p-4 rounded-xl border text-left transition-all
                ${data.submissionType === type.value 
                  ? 'border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30' 
                  : 'border-border hover:border-accent-blue/50 hover:bg-surface-card'}
              `}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{type.icon}</span>
                <div>
                  <div className="font-semibold text-text-primary">{type.label}</div>
                </div>
              </div>
              <p className="text-xs text-text-muted">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {data.submissionType && (data.submissionType === 'sNDA' || data.submissionType === 'sBLA') && (
        <div className="p-4 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-text-primary">Supplemental Submission</h4>
              <p className="text-xs text-text-muted mt-1">
                You've selected a supplemental application. Make sure you have the parent application number ready.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step2ProductSelection({ data, updateData, products }: StepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const search = searchTerm.toLowerCase();
    return products.filter((p: Product) => 
      p.name.toLowerCase().includes(search) ||
      p.brandName?.toLowerCase().includes(search) ||
      p.indication?.toLowerCase().includes(search) ||
      p.therapeuticArea?.toLowerCase().includes(search)
    );
  }, [searchTerm, products]);

  const selectedProduct = products.find((p: Product) => p.id === data.productId);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">Select Product</h3>
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search products by name, brand, or indication..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          />
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        </div>
        
        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-2">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => updateData({ productId: product.id, indication: product.indication || '' })}
              className={`
                w-full p-4 rounded-xl border text-left transition-all
                ${data.productId === product.id 
                  ? 'border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30' 
                  : 'border-border hover:border-accent-blue/50 hover:bg-surface-card'}
              `}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{product.name}</span>
                    {product.brandName && (
                      <Badge color="purple" size="xs">{product.brandName}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">{product.indication}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span>{product.therapeuticArea}</span>
                    <span>•</span>
                    <span>{product.modality}</span>
                    <span>•</span>
                    <Badge color="gray" size="xs">{product.stage}</Badge>
                  </div>
                </div>
                {data.productId === product.id && (
                  <Check className="w-5 h-5 text-accent-blue flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedProduct && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Indication for This Submission</h3>
          <input
            type="text"
            value={data.indication}
            onChange={(e) => updateData({ indication: e.target.value })}
            placeholder="e.g., KRAS G12C+ NSCLC"
            className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          />
          <p className="text-xs text-text-muted mt-2">
            Pre-filled from product record. Modify if this submission is for a different indication.
          </p>
        </div>
      )}
    </div>
  );
}

function Step3HealthAuthority({ data, updateData }: StepProps) {
  const [existingApplications, setExistingApplications] = useState<APIApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [sequenceInfo, setSequenceInfo] = useState<SequenceInfo | null>(null);
  const [isLoadingSequence, setIsLoadingSequence] = useState(false);
  const [useExisting, setUseExisting] = useState(false);
  
  // Auto-select region based on submission type
  const availableRegions = useMemo(() => {
    if (!data.submissionType) return REGIONS;
    const typeConfig = SUBMISSION_TYPES.find(t => t.value === data.submissionType);
    if (!typeConfig) return REGIONS;
    return REGIONS.filter(r => typeConfig.regions.includes(r.value));
  }, [data.submissionType]);

  // Generate suggested application number
  const suggestedAppNumber = useMemo(() => {
    if (!data.submissionType || !data.region) return '';
    const prefix: Record<SubmissionTypeOption, string> = {
      'IND': 'IND ',
      'NDA': 'NDA ',
      'BLA': 'BLA ',
      'sNDA': 'sNDA ',
      'sBLA': 'sBLA ',
      'MAA': 'EMEA/H/C/',
      'CTA': 'CTA ',
      'JNDA': 'JNDA ',
      'NDS': 'NDS ',
    };
    return `${prefix[data.submissionType]}${Math.floor(100000 + Math.random() * 900000)}`;
  }, [data.submissionType, data.region]);

  // Fetch existing applications for the selected product
  useEffect(() => {
    async function fetchApplications() {
      if (!data.productId) {
        setExistingApplications([]);
        return;
      }
      setIsLoadingApps(true);
      try {
        const response = await applicationsApi.getByProduct(data.productId);
        setExistingApplications(response.data);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
        setExistingApplications([]);
      } finally {
        setIsLoadingApps(false);
      }
    }
    fetchApplications();
  }, [data.productId]);

  // Fetch sequence info when existing application is selected
  useEffect(() => {
    async function fetchSequenceInfo() {
      if (!data.existingApplicationId) {
        setSequenceInfo(null);
        return;
      }
      setIsLoadingSequence(true);
      try {
        const response = await applicationsApi.getSequenceInfo(data.existingApplicationId);
        setSequenceInfo(response.data);
        // Auto-populate the sequence number
        updateData({ 
          sequenceNumber: response.data.nextSequenceFormatted,
          applicationNumber: response.data.applicationNumber
        });
      } catch (error) {
        console.error('Failed to fetch sequence info:', error);
        setSequenceInfo(null);
      } finally {
        setIsLoadingSequence(false);
      }
    }
    fetchSequenceInfo();
  }, [data.existingApplicationId]);

  const handleSelectExistingApp = (app: APIApplication) => {
    updateData({
      existingApplicationId: app.id,
      applicationNumber: app.applicationNumber,
      region: app.region as RegionOption,
      agency: app.agency as AgencyOption,
    });
  };

  const handleCreateNew = () => {
    setUseExisting(false);
    updateData({
      existingApplicationId: null,
      sequenceNumber: '0000',
      applicationNumber: suggestedAppNumber,
    });
  };

  return (
    <div className="space-y-6">
      {/* Existing vs New Application Toggle */}
      {existingApplications.length > 0 && (
        <div className="p-4 bg-surface-card rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">Application Selection</h3>
            {isLoadingApps && <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setUseExisting(true)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                useExisting 
                  ? 'bg-accent-blue text-white' 
                  : 'bg-surface border border-border text-text-primary hover:border-accent-blue/50'
              }`}
            >
              <Database className="w-4 h-4 inline mr-2" />
              Use Existing Application
            </button>
            <button
              onClick={handleCreateNew}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !useExisting 
                  ? 'bg-accent-blue text-white' 
                  : 'bg-surface border border-border text-text-primary hover:border-accent-blue/50'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Create New Application
            </button>
          </div>
        </div>
      )}

      {/* Existing Application Selection */}
      {useExisting && existingApplications.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Select Application</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {existingApplications.map((app) => (
              <button
                key={app.id}
                onClick={() => handleSelectExistingApp(app)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  data.existingApplicationId === app.id
                    ? 'border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30'
                    : 'border-border hover:border-accent-blue/50 hover:bg-surface-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-text-primary">{app.applicationNumber}</span>
                    <span className="text-xs text-text-muted ml-2">{app.type} • {app.region}</span>
                  </div>
                  <Badge color={app.status === 'Approved' ? 'green' : app.status === 'Under Review' ? 'blue' : 'slate'} size="sm">
                    {app.status}
                  </Badge>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  Current sequence: {String(app.currentSequence).padStart(4, '0')} • {app.totalSequences} total
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sequence Number Display (when existing app selected) */}
      {data.existingApplicationId && (
        <div className="p-4 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-text-primary">Next Sequence Number</h4>
              <p className="text-xs text-text-muted mt-1">Auto-assigned based on application history</p>
            </div>
            {isLoadingSequence ? (
              <Loader2 className="w-5 h-5 animate-spin text-accent-blue" />
            ) : (
              <div className="text-2xl font-mono font-bold text-accent-blue">
                {data.sequenceNumber || '----'}
              </div>
            )}
          </div>
          {sequenceInfo && sequenceInfo.recentSequences.length > 0 && (
            <div className="mt-3 pt-3 border-t border-accent-blue/20">
              <p className="text-xs text-text-muted mb-2">Recent sequences:</p>
              <div className="flex gap-2 flex-wrap">
                {sequenceInfo.recentSequences.slice(0, 3).map((seq) => (
                  <span key={seq.sequenceNumber} className="text-xs px-2 py-1 bg-surface rounded">
                    {seq.sequenceNumber} ({seq.type.toLowerCase()})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Region Selection (for new applications) */}
      {!useExisting && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Target Health Authority</h3>
          <div className="grid grid-cols-2 gap-3">
            {availableRegions.map((region) => (
              <button
                key={region.value}
                onClick={() => updateData({ 
                  region: region.value, 
                  agency: region.agency,
                  applicationNumber: data.applicationNumber || suggestedAppNumber,
                  sequenceNumber: '0000' // Original submission
                })}
                className={`
                  p-4 rounded-xl border text-left transition-all
                  ${data.region === region.value 
                    ? 'border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30' 
                    : 'border-border hover:border-accent-blue/50 hover:bg-surface-card'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{region.flag}</span>
                  <div>
                    <div className="font-semibold text-text-primary">{region.label}</div>
                    <div className="text-xs text-text-muted">{region.agency}</div>
                  </div>
                  {data.region === region.value && (
                    <Check className="w-5 h-5 text-accent-blue ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Application Details (for new applications) */}
      {!useExisting && data.region && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Application Number
              </label>
              <input
                type="text"
                value={data.applicationNumber}
                onChange={(e) => updateData({ applicationNumber: e.target.value })}
                placeholder={suggestedAppNumber}
                className="w-full px-4 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              />
              <p className="text-xs text-text-muted mt-1">Assigned by health authority</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Sequence Number
              </label>
              <div className="w-full px-4 py-2.5 text-sm bg-surface-card border border-border rounded-lg text-text-muted">
                <span className="font-mono font-bold text-text-primary">0000</span>
                <span className="ml-2 text-xs">(Original submission)</span>
              </div>
              <p className="text-xs text-text-muted mt-1">First sequence for new applications</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Step4ModuleRequirements({ data, updateData }: StepProps) {
  const toggleModule = (moduleId: string) => {
    const current = data.selectedModules;
    const updated = current.includes(moduleId)
      ? current.filter(m => m !== moduleId)
      : [...current, moduleId];
    updateData({ selectedModules: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">eCTD Module Requirements</h3>
        <div className="space-y-2">
          {MODULE_REQUIREMENTS.map((module) => {
            const isSelected = data.selectedModules.includes(module.id);
            return (
              <button
                key={module.id}
                onClick={() => toggleModule(module.id)}
                disabled={module.required}
                className={`
                  w-full p-4 rounded-xl border text-left transition-all
                  ${isSelected 
                    ? 'border-accent-blue bg-accent-blue/10' 
                    : 'border-border hover:border-accent-blue/50 hover:bg-surface-card'}
                  ${module.required ? 'opacity-100' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold
                      ${isSelected ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted'}
                    `}>
                      M{module.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{module.name}</span>
                        {module.required && (
                          <Badge color="red" size="xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{module.description}</p>
                    </div>
                  </div>
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center
                    ${isSelected ? 'bg-accent-blue border-accent-blue' : 'border-border'}
                  `}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">Expedited Program Designation</h3>
        <div className="grid grid-cols-2 gap-2">
          {EXPEDITED_DESIGNATIONS.map((designation) => (
            <button
              key={designation.value}
              onClick={() => updateData({ expeditedDesignation: designation.value })}
              className={`
                p-3 rounded-xl border text-left transition-all
                ${data.expeditedDesignation === designation.value 
                  ? 'border-accent-teal bg-accent-teal/10 ring-2 ring-accent-teal/30' 
                  : 'border-border hover:border-accent-teal/50 hover:bg-surface-card'}
              `}
            >
              <div className="font-medium text-sm text-text-primary">{designation.label}</div>
              <p className="text-xs text-text-muted mt-0.5">{designation.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step5Review({ data, products }: StepProps) {
  const selectedProduct = products.find((p: Product) => p.id === data.productId);
  const selectedRegion = REGIONS.find(r => r.value === data.region);
  const selectedDesignation = EXPEDITED_DESIGNATIONS.find(d => d.value === data.expeditedDesignation);

  const sections = [
    {
      title: 'Submission Type',
      icon: <FileText className="w-4 h-4" />,
      items: [
        { label: 'Type', value: data.submissionType },
        { label: 'Classification', value: data.isOriginal ? 'Original Application' : 'Supplemental' },
      ],
    },
    {
      title: 'Product',
      icon: <Package className="w-4 h-4" />,
      items: [
        { label: 'Product', value: `${selectedProduct?.name} (${selectedProduct?.brandName})` },
        { label: 'Indication', value: data.indication },
        { label: 'Therapeutic Area', value: selectedProduct?.therapeuticArea },
      ],
    },
    {
      title: 'Health Authority',
      icon: <Building2 className="w-4 h-4" />,
      items: [
        { label: 'Region', value: `${selectedRegion?.flag} ${selectedRegion?.label ?? ''}` },
        { label: 'Agency', value: data.agency },
        { label: 'Application #', value: data.applicationNumber || 'TBD' },
        { label: 'Sequence', value: data.sequenceNumber || '0000' },
      ],
    },
    {
      title: 'Requirements',
      icon: <Layers className="w-4 h-4" />,
      items: [
        { label: 'Modules', value: data.selectedModules.map(m => `M${m.replace('m', '')}`).join(', ') },
        { label: 'Designation', value: selectedDesignation?.label || 'None' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-text-primary">Ready to Create</h4>
            <p className="text-xs text-text-muted mt-1">
              Review the submission details below. Click "Create Submission" to add this to your portfolio.
            </p>
          </div>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="bg-surface-elevated border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 text-text-muted">
            {section.icon}
            <h4 className="text-sm font-medium text-text-primary">{section.title}</h4>
          </div>
          <div className="space-y-2">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{item.label}</span>
                <span className="font-medium text-text-primary">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

const STEPS = [
  { id: 1, title: 'Submission Type', icon: FileText, description: 'Select regulatory submission type' },
  { id: 2, title: 'Product', icon: Package, description: 'Choose product and indication' },
  { id: 3, title: 'Health Authority', icon: Building2, description: 'Target region and application details' },
  { id: 4, title: 'Requirements', icon: Layers, description: 'Module requirements and designations' },
  { id: 5, title: 'Review', icon: ClipboardCheck, description: 'Review and create submission' },
];

export function NewSubmissionWizard({ isOpen, onClose, onComplete }: NewSubmissionWizardProps) {
  const products = useProducts();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  const [data, setData] = useState<WizardData>({
    submissionType: null,
    isOriginal: true,
    productId: null,
    indication: '',
    region: null,
    agency: null,
    applicationNumber: '',
    sequenceNumber: '0000',
    existingApplicationId: null,
    selectedModules: ['m1', 'm2', 'm3', 'm4', 'm5'], // Default all selected
    expeditedDesignation: null,
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: return !!data.submissionType;
      case 2: return !!data.productId && !!data.indication;
      case 3: return !!data.region && !!data.agency;
      case 4: return data.selectedModules.length > 0;
      case 5: return true;
      default: return false;
    }
  }, [currentStep, data]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    
    try {
      // If using an existing application, reserve the sequence number
      if (data.existingApplicationId) {
        const submissionType = data.submissionType?.toLowerCase() || 'amendment';
        const typeMapping: Record<string, 'original' | 'amendment' | 'supplement' | 'response'> = {
          'ind': 'original',
          'nda': 'original',
          'bla': 'original',
          'maa': 'original',
          'cta': 'original',
          'jnda': 'original',
          'nds': 'original',
          'snda': 'supplement',
          'sbla': 'supplement',
        };
        
        await applicationsApi.reserveSequence(data.existingApplicationId, {
          type: typeMapping[submissionType] || 'amendment',
          description: data.indication || `${data.submissionType} submission`,
        });
      }
      
      onComplete(data);
    } catch (error) {
      console.error('Failed to create submission:', error);
      // Still complete even if API fails (graceful degradation)
      onComplete(data);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setData({
      submissionType: null,
      isOriginal: true,
      productId: null,
      indication: '',
      region: null,
      agency: null,
      applicationNumber: '',
      sequenceNumber: '0000',
      existingApplicationId: null,
      selectedModules: ['m1', 'm2', 'm3', 'm4', 'm5'],
      expeditedDesignation: null,
    });
    onClose();
  };

  const renderStepContent = () => {
    const props = { data, updateData, products };
    switch (currentStep) {
      case 1: return <Step1SubmissionType {...props} />;
      case 2: return <Step2ProductSelection {...props} />;
      case 3: return <Step3HealthAuthority {...props} />;
      case 4: return <Step4ModuleRequirements {...props} />;
      case 5: return <Step5Review {...props} />;
      default: return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="full"
      showCloseButton={false}
      closeOnEscape={!isCreating}
      closeOnBackdropClick={!isCreating}
    >
      <div className="flex flex-col h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Create New Submission</h2>
            <p className="text-sm text-text-muted mt-1">Step {currentStep} of 5: {STEPS[currentStep - 1].description}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between py-4 px-2">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isComplete = currentStep > step.id;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                    ${isComplete ? 'bg-accent-green text-white' : 
                      isActive ? 'bg-accent-blue text-white' : 
                      'bg-surface-card text-text-muted border border-border'}
                  `}>
                    {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${isActive ? 'text-accent-blue' : 'text-text-muted'}`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`
                    w-20 h-0.5 mx-3 mb-6
                    ${currentStep > step.id ? 'bg-accent-green' : 'bg-border'}
                  `} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto py-4">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || isCreating}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
            
            {currentStep < 5 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canProceed}
                icon={<ChevronRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleCreate}
                disabled={!canProceed}
                loading={isCreating}
                icon={<Check className="w-4 h-4" />}
              >
                Create Submission
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default NewSubmissionWizard;
