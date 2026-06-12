

import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Trash2, Edit3, Target, FlaskConical, 
  Languages, Palette, Package, Key, Settings, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// ============================================================================
// v157: CRUD Modals - Edit/Delete functionality with validation and toasts
// v0.42.25: Added typed input interfaces for onSave callbacks
// ============================================================================

// Edit input types for onSave callbacks
export interface EditTargetInput {
  id: string;
  target: string;
  targetClass: string;
  indication: string;
  modality: string;
  stage: string;
  team: string;
  rationale?: string;
  nextMilestone?: string;
  nextMilestoneDate?: string;
}

export interface EditStudyInput {
  id: string;
  title: string;
  studyNumber?: string;
  type: string;
  species: string;
  cro: string;
  startDate: string;
  endDate?: string;
  duration?: string;
  glpCompliant: boolean;
  objectives?: string;
  status?: string;
  findings?: string;
}

export interface EditArtworkInput {
  id?: string;
  artworkName?: string;
  name?: string;
  artworkType?: string;
  type?: string;
  product?: string;
  market?: string;
  format?: string;
  description?: string;
  status?: string;
  designer?: string;
  dimensions?: string;
  labelVersion?: string;
}

export interface EditSKUInput {
  id?: string;
  skuCode?: string;
  ndc?: string;
  gtin?: string;
  productName?: string;
  description?: string;
  presentation?: string;
  strength?: string;
  packSize?: string;
  packType?: string;
  targetMarkets?: string[];
  status?: string;
}

export interface EditRoleInput {
  roleName: string;
  description: string;
  department: string;
  basePermission: string;
  modules: Record<string, string>;
  index?: number;
  permissions?: Record<string, unknown>;
  name?: string;
}

// Shared form field with validation
interface ValidatedFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}

const ValidatedField = ({ label, required, error, children, hint }: ValidatedFieldProps) => (
  <div>
    <label className="text-sm font-medium text-text-primary block mb-2">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-accent-red mt-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
    {hint && !error && <p className="text-xs text-text-muted mt-1">{hint}</p>}
  </div>
);

const ValidatedTextField = ({ 
  value, 
  onChange, 
  placeholder, 
  error,
  type = 'text' 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string; 
  error?: boolean;
  type?: string;
}) => (
  <input 
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full px-3 py-2 bg-surface-card border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors ${
      error ? 'border-accent-red' : 'border-border'
    }`}
  />
);

const SelectField = ({ 
  value, 
  onChange, 
  options, 
  placeholder,
  error 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: { value: string; label: string }[]; 
  placeholder?: string;
  error?: boolean;
}) => (
  <select 
    value={value} 
    onChange={(e) => onChange(e.target.value)}
    className={`w-full px-3 py-2 bg-surface-card border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors ${
      error ? 'border-accent-red' : 'border-border'
    }`}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ============================================================================
// CONFIRMATION DIALOG
// ============================================================================

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemType: string;
  itemName: string;
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, itemType, itemName }: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-accent-red/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-accent-red" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Delete {itemType}</h2>
              <p className="text-sm text-text-muted">This action cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mb-6">
            Are you sure you want to delete <strong className="text-text-primary">{itemName}</strong>? 
            This will permanently remove it from the system.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={() => { onConfirm(); onClose(); }}
              className="!bg-accent-red hover:!bg-accent-red/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT TARGET MODAL
// ============================================================================

const targetClassOptions = [
  { value: 'kinase', label: 'Kinase' },
  { value: 'gpcr', label: 'GPCR' },
  { value: 'ion-channel', label: 'Ion Channel' },
  { value: 'nuclear-receptor', label: 'Nuclear Receptor' },
  { value: 'enzyme', label: 'Enzyme' },
  { value: 'transporter', label: 'Transporter' },
  { value: 'cell-surface', label: 'Cell Surface Receptor' },
  { value: 'other', label: 'Other' },
];

const stageOptions = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'lead-opt', label: 'Lead Optimization' },
  { value: 'preclinical', label: 'Preclinical' },
  { value: 'ind-enabling', label: 'IND-Enabling' },
  { value: 'clinical', label: 'Clinical' },
];

const modalityOptions = [
  { value: 'small-molecule', label: 'Small Molecule' },
  { value: 'monoclonal-antibody', label: 'Monoclonal Antibody' },
  { value: 'bispecific', label: 'Bispecific Antibody' },
  { value: 'adc', label: 'Antibody-Drug Conjugate' },
  { value: 'peptide', label: 'Peptide' },
  { value: 'oligonucleotide', label: 'Oligonucleotide' },
  { value: 'cell-therapy', label: 'Cell Therapy' },
  { value: 'gene-therapy', label: 'Gene Therapy' },
];

interface EditTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditTargetInput) => void;
  target: {
    id: string;
    target: string;
    targetClass: string;
    indication: string;
    modality: string;
    stage: string;
    team: string;
    rationale?: string;
    nextMilestone?: string;
    nextMilestoneDate?: string;
  } | null;
}

export function EditTargetModal({ isOpen, onClose, onSave, target }: EditTargetModalProps) {
  const [formData, setFormData] = useState({
    target: '',
    targetClass: '',
    indication: '',
    modality: '',
    stage: 'discovery',
    team: '',
    rationale: '',
    nextMilestone: '',
    nextMilestoneDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (target) {
      setFormData({
        target: target.target || '',
        targetClass: target.targetClass || '',
        indication: target.indication || '',
        modality: target.modality || '',
        stage: target.stage || 'discovery',
        team: target.team || '',
        rationale: target.rationale || '',
        nextMilestone: target.nextMilestone || '',
        nextMilestoneDate: target.nextMilestoneDate || '',
      });
      setErrors({});
      setTouched({});
    }
  }, [target]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.target.trim()) newErrors.target = 'Target name is required';
    if (!formData.targetClass) newErrors.targetClass = 'Target class is required';
    if (!formData.indication.trim()) newErrors.indication = 'Indication is required';
    if (!formData.modality) newErrors.modality = 'Modality is required';
    if (!formData.team.trim()) newErrors.team = 'Team is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setTouched({ target: true, targetClass: true, indication: true, modality: true, team: true });
    if (validate()) {
      onSave({ ...formData, id: target?.id });
      onClose();
    }
  };

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-accent-blue" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Edit Target</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-auto flex-1 space-y-4">
          <ValidatedField label="Target Name" required error={touched.target ? errors.target : undefined}>
            <ValidatedTextField 
              value={formData.target} 
              onChange={(v) => setFormData({ ...formData, target: v })}
              placeholder="e.g., CDK4/6, EGFR, PD-L1"
              error={touched.target && !!errors.target}
            />
          </ValidatedField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="Target Class" required error={touched.targetClass ? errors.targetClass : undefined}>
              <SelectField 
                value={formData.targetClass}
                onChange={(v) => setFormData({ ...formData, targetClass: v })}
                options={targetClassOptions}
                placeholder="Select class..."
                error={touched.targetClass && !!errors.targetClass}
              />
            </ValidatedField>
            <ValidatedField label="Stage">
              <SelectField 
                value={formData.stage}
                onChange={(v) => setFormData({ ...formData, stage: v })}
                options={stageOptions}
              />
            </ValidatedField>
          </div>
          <ValidatedField label="Primary Indication" required error={touched.indication ? errors.indication : undefined}>
            <ValidatedTextField 
              value={formData.indication}
              onChange={(v) => setFormData({ ...formData, indication: v })}
              placeholder="e.g., Non-Small Cell Lung Cancer"
              error={touched.indication && !!errors.indication}
            />
          </ValidatedField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="Modality" required error={touched.modality ? errors.modality : undefined}>
              <SelectField 
                value={formData.modality}
                onChange={(v) => setFormData({ ...formData, modality: v })}
                options={modalityOptions}
                placeholder="Select modality..."
                error={touched.modality && !!errors.modality}
              />
            </ValidatedField>
            <ValidatedField label="Lead Team" required error={touched.team ? errors.team : undefined}>
              <ValidatedTextField 
                value={formData.team}
                onChange={(v) => setFormData({ ...formData, team: v })}
                placeholder="e.g., Oncology Discovery"
                error={touched.team && !!errors.team}
              />
            </ValidatedField>
          </div>
          <ValidatedField label="Next Milestone">
            <ValidatedTextField 
              value={formData.nextMilestone}
              onChange={(v) => setFormData({ ...formData, nextMilestone: v })}
              placeholder="e.g., Lead compound selection"
            />
          </ValidatedField>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT STUDY MODAL
// ============================================================================

const studyTypeOptions = [
  { value: 'pk', label: 'Pharmacokinetics (PK)' },
  { value: 'pd', label: 'Pharmacodynamics (PD)' },
  { value: 'tox-acute', label: 'Acute Toxicology' },
  { value: 'tox-repeat', label: 'Repeat-Dose Toxicology' },
  { value: 'toxicology', label: 'Toxicology' },
  { value: 'genotox', label: 'Genotoxicity' },
  { value: 'safety-pharm', label: 'Safety Pharmacology' },
];

const speciesOptions = [
  { value: 'Mouse', label: 'Mouse' },
  { value: 'Rat', label: 'Rat' },
  { value: 'Rabbit', label: 'Rabbit' },
  { value: 'Dog', label: 'Dog' },
  { value: 'NHP', label: 'Non-Human Primate' },
];

const studyStatusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'report-draft', label: 'Report Draft' },
  { value: 'final', label: 'Final' },
];

interface EditStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditStudyInput) => void;
  study: {
    id: string;
    studyNumber: string;
    title: string;
    type: string;
    species: string;
    product: string;
    cro: string;
    status: string;
    glpCompliant: boolean;
    startDate?: string;
  } | null;
}

export function EditStudyModal({ isOpen, onClose, onSave, study }: EditStudyModalProps) {
  const [formData, setFormData] = useState({
    studyNumber: '',
    title: '',
    type: '',
    species: '',
    cro: '',
    status: 'planned',
    glpCompliant: true,
    startDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (study) {
      setFormData({
        studyNumber: study.studyNumber || '',
        title: study.title || '',
        type: study.type || '',
        species: study.species || '',
        cro: study.cro || '',
        status: study.status || 'planned',
        glpCompliant: study.glpCompliant ?? true,
        startDate: study.startDate || '',
      });
      setErrors({});
      setTouched({});
    }
  }, [study]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Study title is required';
    if (!formData.type) newErrors.type = 'Study type is required';
    if (!formData.species) newErrors.species = 'Species is required';
    if (!formData.cro.trim()) newErrors.cro = 'CRO is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setTouched({ title: true, type: true, species: true, cro: true });
    if (validate()) {
      onSave({ ...formData, id: study?.id });
      onClose();
    }
  };

  if (!isOpen || !study) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-accent-blue" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Edit Study</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="Study Number">
              <ValidatedTextField 
                value={formData.studyNumber} 
                onChange={(v) => setFormData({ ...formData, studyNumber: v })}
                placeholder="e.g., TOX-2025-001"
              />
            </ValidatedField>
            <ValidatedField label="Status">
              <SelectField 
                value={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v })}
                options={studyStatusOptions}
              />
            </ValidatedField>
          </div>
          <ValidatedField label="Study Title" required error={touched.title ? errors.title : undefined}>
            <ValidatedTextField 
              value={formData.title}
              onChange={(v) => setFormData({ ...formData, title: v })}
              placeholder="e.g., 28-Day Repeat Dose Toxicity Study"
              error={touched.title && !!errors.title}
            />
          </ValidatedField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="Study Type" required error={touched.type ? errors.type : undefined}>
              <SelectField 
                value={formData.type}
                onChange={(v) => setFormData({ ...formData, type: v })}
                options={studyTypeOptions}
                placeholder="Select type..."
                error={touched.type && !!errors.type}
              />
            </ValidatedField>
            <ValidatedField label="Species" required error={touched.species ? errors.species : undefined}>
              <SelectField 
                value={formData.species}
                onChange={(v) => setFormData({ ...formData, species: v })}
                options={speciesOptions}
                placeholder="Select species..."
                error={touched.species && !!errors.species}
              />
            </ValidatedField>
          </div>
          <ValidatedField label="CRO" required error={touched.cro ? errors.cro : undefined}>
            <ValidatedTextField 
              value={formData.cro}
              onChange={(v) => setFormData({ ...formData, cro: v })}
              placeholder="e.g., Charles River Laboratories"
              error={touched.cro && !!errors.cro}
            />
          </ValidatedField>
          <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg border border-border">
            <div>
              <div className="text-sm text-text-primary">GLP Compliant</div>
              <div className="text-xs text-text-muted">Good Laboratory Practice</div>
            </div>
            <button 
              onClick={() => setFormData({ ...formData, glpCompliant: !formData.glpCompliant })}
              className={`w-12 h-6 rounded-full transition-colors ${formData.glpCompliant ? 'bg-accent-green' : 'bg-surface'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${formData.glpCompliant ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT ARTWORK MODAL
// ============================================================================

const artworkTypeOptions = [
  { value: 'carton', label: 'Carton' },
  { value: 'label', label: 'Label' },
  { value: 'insert', label: 'Insert (PIL)' },
  { value: 'blister', label: 'Blister' },
  { value: 'bottle', label: 'Bottle Label' },
];

const artworkStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'print-ready', label: 'Print Ready' },
];

interface EditArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditArtworkInput) => void;
  artwork: {
    id: string;
    name: string;
    type: string;
    market: string;
    status: string;
    designer: string;
    dimensions?: string;
  } | null;
}

export function EditArtworkModal({ isOpen, onClose, onSave, artwork }: EditArtworkModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    market: '',
    status: 'draft',
    designer: '',
    dimensions: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (artwork) {
      setFormData({
        name: artwork.name || '',
        type: artwork.type || '',
        market: artwork.market || '',
        status: artwork.status || 'draft',
        designer: artwork.designer || '',
        dimensions: artwork.dimensions || '',
      });
      setErrors({});
      setTouched({});
    }
  }, [artwork]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Artwork name is required';
    if (!formData.type) newErrors.type = 'Type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setTouched({ name: true, type: true });
    if (validate()) {
      onSave({ ...formData, id: artwork?.id });
      onClose();
    }
  };

  if (!isOpen || !artwork) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-[500px] shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-accent-purple" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Edit Artwork</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <ValidatedField label="Artwork Name" required error={touched.name ? errors.name : undefined}>
            <ValidatedTextField 
              value={formData.name} 
              onChange={(v) => setFormData({ ...formData, name: v })}
              error={touched.name && !!errors.name}
            />
          </ValidatedField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="Type" required error={touched.type ? errors.type : undefined}>
              <SelectField 
                value={formData.type}
                onChange={(v) => setFormData({ ...formData, type: v })}
                options={artworkTypeOptions}
                error={touched.type && !!errors.type}
              />
            </ValidatedField>
            <ValidatedField label="Status">
              <SelectField 
                value={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v })}
                options={artworkStatusOptions}
              />
            </ValidatedField>
          </div>
          <ValidatedField label="Designer">
            <ValidatedTextField 
              value={formData.designer}
              onChange={(v) => setFormData({ ...formData, designer: v })}
              placeholder="e.g., PackDesign Co."
            />
          </ValidatedField>
          <ValidatedField label="Dimensions">
            <ValidatedTextField 
              value={formData.dimensions}
              onChange={(v) => setFormData({ ...formData, dimensions: v })}
              placeholder="e.g., 120x80x40mm"
            />
          </ValidatedField>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT SKU MODAL
// ============================================================================

const skuStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'discontinued', label: 'Discontinued' },
];

interface EditSKUModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditSKUInput) => void;
  sku: {
    id: string;
    ndc: string;
    gtin: string;
    description: string;
    strength: string;
    packSize: string;
    packType: string;
    status: string;
  } | null;
}

export function EditSKUModal({ isOpen, onClose, onSave, sku }: EditSKUModalProps) {
  const [formData, setFormData] = useState({
    ndc: '',
    gtin: '',
    description: '',
    strength: '',
    packSize: '',
    packType: '',
    status: 'pending',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sku) {
      setFormData({
        ndc: sku.ndc || '',
        gtin: sku.gtin || '',
        description: sku.description || '',
        strength: sku.strength || '',
        packSize: sku.packSize || '',
        packType: sku.packType || '',
        status: sku.status || 'pending',
      });
      setErrors({});
      setTouched({});
    }
  }, [sku]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.strength.trim()) newErrors.strength = 'Strength is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setTouched({ description: true, strength: true });
    if (validate()) {
      onSave({ ...formData, id: sku?.id });
      onClose();
    }
  };

  if (!isOpen || !sku) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-[500px] shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-teal/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent-teal" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Edit SKU</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="NDC">
              <ValidatedTextField 
                value={formData.ndc} 
                onChange={(v) => setFormData({ ...formData, ndc: v })}
                placeholder="12345-678-30"
              />
            </ValidatedField>
            <ValidatedField label="GTIN">
              <ValidatedTextField 
                value={formData.gtin} 
                onChange={(v) => setFormData({ ...formData, gtin: v })}
                placeholder="00312345678301"
              />
            </ValidatedField>
          </div>
          <ValidatedField label="Description" required error={touched.description ? errors.description : undefined}>
            <ValidatedTextField 
              value={formData.description} 
              onChange={(v) => setFormData({ ...formData, description: v })}
              error={touched.description && !!errors.description}
            />
          </ValidatedField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="Strength" required error={touched.strength ? errors.strength : undefined}>
              <ValidatedTextField 
                value={formData.strength}
                onChange={(v) => setFormData({ ...formData, strength: v })}
                placeholder="e.g., 200mg"
                error={touched.strength && !!errors.strength}
              />
            </ValidatedField>
            <ValidatedField label="Status">
              <SelectField 
                value={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v })}
                options={skuStatusOptions}
              />
            </ValidatedField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ValidatedField label="Pack Size">
              <ValidatedTextField 
                value={formData.packSize}
                onChange={(v) => setFormData({ ...formData, packSize: v })}
                placeholder="e.g., 30 tablets"
              />
            </ValidatedField>
            <ValidatedField label="Pack Type">
              <ValidatedTextField 
                value={formData.packType}
                onChange={(v) => setFormData({ ...formData, packType: v })}
                placeholder="e.g., Bottle"
              />
            </ValidatedField>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EDIT ROLE MODAL
// ============================================================================

const departmentOptions = [
  { value: 'regulatory', label: 'Regulatory Affairs' },
  { value: 'clinical', label: 'Clinical Operations' },
  { value: 'quality', label: 'Quality Assurance' },
  { value: 'safety', label: 'Drug Safety' },
  { value: 'cmc', label: 'CMC' },
  { value: 'it', label: 'IT' },
];

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditRoleInput) => void;
  role: {
    name: string;
    department: string;
    permissions: Record<string, string>;
  } | null;
  roleIndex: number;
}

export function EditRoleModal({ isOpen, onClose, onSave, role, roleIndex }: EditRoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        department: role.department || '',
      });
      setErrors({});
      setTouched({});
    }
  }, [role]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Role name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setTouched({ name: true, department: true });
    if (validate()) {
      onSave({ ...formData, index: roleIndex, permissions: role?.permissions || {} } as any);
      onClose();
    }
  };

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-[450px] shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-amber/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-accent-amber" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">Edit Role</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <ValidatedField label="Role Name" required error={touched.name ? errors.name : undefined}>
            <ValidatedTextField 
              value={formData.name} 
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="e.g., Regulatory Specialist"
              error={touched.name && !!errors.name}
            />
          </ValidatedField>
          <ValidatedField label="Department" required error={touched.department ? errors.department : undefined}>
            <SelectField 
              value={formData.department}
              onChange={(v) => setFormData({ ...formData, department: v })}
              options={departmentOptions}
              placeholder="Select department..."
              error={touched.department && !!errors.department}
            />
          </ValidatedField>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
