

import { useState } from 'react';
import { X, AlertTriangle, Shield, ClipboardCheck, FileText, BookOpen, Check, ChevronRight, Calendar, User, Building, FileWarning, Target, Users, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { DeviationType, DeviationCategory, QMSSeverity, QMSDepartment, CAPAType, CAPASource, QMSPriority, AuditType, ChangeCategory, ChangeType } from '@/store/qmsTypes';

// ============================================================================
// INPUT TYPES FOR MODAL DATA
// ============================================================================

export interface NewDeviationInput {
  title: string;
  deviationType: string;
  category: string;
  department: string;
  description: string;
  occurrenceDate: string;
  discoveredBy: string;
  reportedBy: string;
  affectedArea: string;
  affectedProducts: string[];
  severity: string;
  patientSafetyImpact: string;
  regulatoryImpact: string;
  immediateActions: { description: string; takenBy: string }[];
  ownerName?: string;
}

export interface NewCAPAInput {
  title: string;
  type: string;
  source: string;
  sourceReference: string;
  department: string;
  description: string;
  problemStatement: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
  rootCauseRequired: boolean;
  effectivenessCheckRequired: boolean;
  capaType?: string;
  severity?: string;
  ownerName?: string;
  assigneeName?: string;
  affectedProcesses?: string;
  targetCompletionDate?: string;
}

export interface NewAuditInput {
  title: string;
  auditType: string;
  department: string;
  scope: string;
  objectives: string;
  criteria: string;
  scheduledStart: string;
  scheduledEnd: string;
  leadAuditor: string;
  auditeeContact: string;
}

export interface NewChangeControlInput {
  title: string;
  changeType: ChangeType;
  category: ChangeCategory;
  department: QMSDepartment;
  description: string;
  justification: string;
  proposedImplementation: string;
  priority: QMSPriority;
  riskLevel: string;
  regulatoryImpact: boolean;
  validationRequired: boolean;
  affectedDocuments: string[];
  affectedSystems: string[];
}

export interface AssignResourceInput {
  resourceId: string;
  role: string;
  responsibilities: string;
  startDate: string;
  estimatedHours: number;
}

// Form data types (internal state with string values for inputs)
interface DeviationFormData {
  title: string;
  deviationType: string;
  category: string;
  department: string;
  description: string;
  occurrenceDate: string;
  discoveredBy: string;
  affectedArea: string;
  affectedProducts: string;
  severity: string;
  patientSafetyImpact: string;
  regulatoryImpact: string;
  immediateActions: { description: string; takenBy: string }[];
}

interface CAPAFormData {
  title: string;
  type: string;
  source: string;
  sourceReference: string;
  department: string;
  description: string;
  problemStatement: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
  rootCauseRequired: boolean;
  effectivenessCheckRequired: boolean;
}

interface AuditFormData {
  title: string;
  auditType: string;
  department: string;
  scope: string;
  objectives: string;
  criteria: string;
  scheduledStart: string;
  scheduledEnd: string;
  leadAuditor: string;
  auditeeContact: string;
}

interface ChangeControlFormData {
  title: string;
  changeType: ChangeType;
  category: ChangeCategory;
  department: QMSDepartment;
  description: string;
  justification: string;
  proposedImplementation: string;
  priority: QMSPriority;
  riskLevel: string;
  regulatoryImpact: boolean;
  validationRequired: boolean;
  affectedDocuments: string[];
  affectedSystems: string[];
}

interface AssignResourceFormData {
  resourceId: string;
  role: string;
  responsibilities: string;
  startDate: string;
  estimatedHours: string;
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const FormField = ({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) => (
  <div>
    <label className="text-sm font-medium text-text-primary block mb-2">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
  </div>
);

const SelectField = ({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) => (
  <select 
    value={value} 
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const TextField = ({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) => (
  <input 
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
  />
);

const TextAreaField = ({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) => (
  <textarea 
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
  />
);

const StepIndicator = ({ steps, currentStep }: { steps: string[]; currentStep: number }) => (
  <div className="flex items-center mb-6">
    {steps.map((step, idx) => (
      <div key={idx} className="flex-1 flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
          idx + 1 < currentStep ? 'bg-accent-green text-white' : 
          idx + 1 === currentStep ? 'bg-accent-blue text-white' : 
          'bg-surface-card text-text-muted border border-border'
        }`}>
          {idx + 1 < currentStep ? <Check className="w-4 h-4" /> : idx + 1}
        </div>
        <div className={`ml-2 text-xs ${idx + 1 === currentStep ? 'text-text-primary font-medium' : 'text-text-muted'} hidden sm:block`}>
          {step}
        </div>
        {idx < steps.length - 1 && (
          <div className={`flex-1 h-1 mx-3 rounded ${idx + 1 < currentStep ? 'bg-accent-green' : 'bg-border'}`} />
        )}
      </div>
    ))}
  </div>
);

const ModalWrapper = ({ title, icon, onClose, children, footer }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-[700px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
            {icon}
          </div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
          <X className="w-5 h-5 text-text-muted" />
        </button>
      </div>
      <div className="p-4 md:p-6 overflow-auto flex-1">
        {children}
      </div>
      <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
        {footer}
      </div>
    </div>
  </div>
);

// ============================================================================
// OPTION LISTS
// ============================================================================

const deviationTypeOptions = [
  { value: 'planned', label: 'Planned Deviation' },
  { value: 'unplanned', label: 'Unplanned Deviation' },
  { value: 'temporary', label: 'Temporary Deviation' },
];

const deviationCategoryOptions = [
  { value: 'process', label: 'Process' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'material', label: 'Material' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'personnel', label: 'Personnel' },
  { value: 'facility', label: 'Facility' },
  { value: 'system', label: 'System' },
];

const severityOptions = [
  { value: 'critical', label: 'Critical' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
];

const priorityOptions = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const departmentOptions = [
  { value: 'regulatory-affairs', label: 'Regulatory Affairs' },
  { value: 'clinical-operations', label: 'Clinical Operations' },
  { value: 'quality-assurance', label: 'Quality Assurance' },
  { value: 'quality-control', label: 'Quality Control' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'r-and-d', label: 'R&D' },
  { value: 'medical-affairs', label: 'Medical Affairs' },
  { value: 'pharmacovigilance', label: 'Pharmacovigilance' },
  { value: 'data-management', label: 'Data Management' },
  { value: 'biostatistics', label: 'Biostatistics' },
  { value: 'supply-chain', label: 'Supply Chain' },
  { value: 'facilities', label: 'Facilities' },
];

const capaTypeOptions = [
  { value: 'corrective', label: 'Corrective Action' },
  { value: 'preventive', label: 'Preventive Action' },
  { value: 'both', label: 'Both (CAPA)' },
];

const capaSourceOptions = [
  { value: 'deviation', label: 'Deviation' },
  { value: 'audit-finding', label: 'Audit Finding' },
  { value: 'complaint', label: 'Customer Complaint' },
  { value: 'oov', label: 'Out of Specification/Trend' },
  { value: 'trend-analysis', label: 'Trend Analysis' },
  { value: 'risk-assessment', label: 'Risk Assessment' },
  { value: 'management-review', label: 'Management Review' },
  { value: 'regulatory-observation', label: 'Regulatory Observation' },
  { value: 'supplier-issue', label: 'Supplier Issue' },
  { value: 'process-improvement', label: 'Process Improvement' },
];

const auditTypeOptions = [
  { value: 'internal', label: 'Internal Audit' },
  { value: 'external', label: 'External Audit' },
  { value: 'regulatory', label: 'Regulatory Inspection' },
  { value: 'customer', label: 'Customer Audit' },
  { value: 'supplier', label: 'Supplier Audit' },
  { value: 'certification', label: 'Certification Audit' },
  { value: 'self-inspection', label: 'Self-Inspection' },
];

const auditScopeOptions = [
  { value: 'system', label: 'System Audit' },
  { value: 'process', label: 'Process Audit' },
  { value: 'product', label: 'Product Audit' },
  { value: 'compliance', label: 'Compliance Audit' },
];

const changeTypeOptions = [
  { value: 'process', label: 'Process Change' },
  { value: 'equipment', label: 'Equipment Change' },
  { value: 'material', label: 'Material Change' },
  { value: 'document', label: 'Document Change' },
  { value: 'facility', label: 'Facility Change' },
  { value: 'system', label: 'System/Software Change' },
  { value: 'supplier', label: 'Supplier Change' },
  { value: 'specification', label: 'Specification Change' },
];

const changeCategoryOptions = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'administrative', label: 'Administrative' },
];

const productImpactOptions = [
  { value: 'none', label: 'None' },
  { value: 'potential', label: 'Potential Impact' },
  { value: 'confirmed', label: 'Confirmed Impact' },
];

const regulatoryImpactOptions = [
  { value: 'none', label: 'No Regulatory Impact' },
  { value: 'reportable', label: 'Reportable Event' },
  { value: 'requires-notification', label: 'Requires Notification' },
];

// ============================================================================
// NEW DEVIATION MODAL
// ============================================================================

interface NewDeviationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewDeviationInput) => void;
}

export function NewDeviationModal({ isOpen, onClose, onCreate }: NewDeviationModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<DeviationFormData>({
    title: '',
    deviationType: 'unplanned' as DeviationType,
    category: 'process' as DeviationCategory,
    department: 'manufacturing' as QMSDepartment,
    description: '',
    occurrenceDate: new Date().toISOString().split('T')[0],
    discoveredBy: '',
    affectedArea: '',
    affectedProducts: '',
    severity: 'minor' as QMSSeverity,
    patientSafetyImpact: 'none',
    regulatoryImpact: 'none',
    immediateActions: [] as { description: string; takenBy: string }[],
  });

  const [newAction, setNewAction] = useState({ description: '', takenBy: '' });

  if (!isOpen) return null;

  const updateField = <K extends keyof DeviationFormData>(field: K, value: DeviationFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addImmediateAction = () => {
    if (newAction.description && newAction.takenBy) {
      setFormData(prev => ({
        ...prev,
        immediateActions: [...prev.immediateActions, { ...newAction }]
      }));
      setNewAction({ description: '', takenBy: '' });
    }
  };

  const removeAction = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      immediateActions: prev.immediateActions.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = () => {
    (onCreate as (d: any) => void)({
      title: formData.title,
      deviationType: formData.deviationType as any,
      category: formData.category as any,
      department: formData.department as any,
      description: formData.description,
      occurrenceDate: formData.occurrenceDate,
      discoveredBy: formData.discoveredBy,
      reportedBy: formData.discoveredBy,
      affectedArea: formData.affectedArea,
      affectedProducts: formData.affectedProducts ? [formData.affectedProducts] : [],
      severity: formData.severity as any,
      patientSafetyImpact: formData.patientSafetyImpact,
      regulatoryImpact: formData.regulatoryImpact,
      ownerName: formData.discoveredBy || 'Quality Manager',
    });
    onClose();
    setStep(1);
    setFormData({
      title: '', deviationType: 'unplanned', category: 'process', department: 'manufacturing',
      description: '', occurrenceDate: new Date().toISOString().split('T')[0], discoveredBy: '',
      affectedArea: '', affectedProducts: '', severity: 'minor', patientSafetyImpact: 'none',
      regulatoryImpact: 'none', immediateActions: [],
    });
  };

  const canProceed = () => {
    if (step === 1) return formData.title && formData.deviationType && formData.category;
    if (step === 2) return formData.occurrenceDate && formData.discoveredBy;
    if (step === 3) return formData.severity;
    return true;
  };

  const steps = ['Basic Info', 'Discovery', 'Impact', 'Actions'];

  return (
    <ModalWrapper
      title="New Deviation"
      icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
      onClose={onClose}
      footer={
        <>
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()} 
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step < 4 ? (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue →
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSubmit}>
                <Check className="w-4 h-4 mr-1" /> Create Deviation
              </Button>
            )}
          </div>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Title" required>
            <TextField 
              value={formData.title} 
              onChange={(v) => updateField('title', v)} 
              placeholder="Brief description of the deviation"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Type" required>
              <SelectField 
                value={formData.deviationType} 
                onChange={(v) => updateField('deviationType', v)} 
                options={deviationTypeOptions}
              />
            </FormField>
            <FormField label="Category" required>
              <SelectField 
                value={formData.category} 
                onChange={(v) => updateField('category', v)} 
                options={deviationCategoryOptions}
              />
            </FormField>
          </div>
          <FormField label="Department" required>
            <SelectField 
              value={formData.department} 
              onChange={(v) => updateField('department', v)} 
              options={departmentOptions}
            />
          </FormField>
          <FormField label="Description">
            <TextAreaField 
              value={formData.description} 
              onChange={(v) => updateField('description', v)} 
              placeholder="Detailed description of what occurred..."
              rows={4}
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Occurrence Date" required>
              <TextField 
                type="date"
                value={formData.occurrenceDate} 
                onChange={(v) => updateField('occurrenceDate', v)}
              />
            </FormField>
            <FormField label="Discovered By" required>
              <TextField 
                value={formData.discoveredBy} 
                onChange={(v) => updateField('discoveredBy', v)} 
                placeholder="Name of person who discovered"
              />
            </FormField>
          </div>
          <FormField label="Affected Area" hint="Location, room, equipment, or process">
            <TextField 
              value={formData.affectedArea} 
              onChange={(v) => updateField('affectedArea', v)} 
              placeholder="e.g., Clean Room A, Tablet Press Line 1"
            />
          </FormField>
          <FormField label="Affected Products" hint="If applicable">
            <TextField 
              value={formData.affectedProducts} 
              onChange={(v) => updateField('affectedProducts', v)} 
              placeholder="e.g., LIG-2847 Batch 2024-001"
            />
          </FormField>
          <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent-blue mt-0.5" />
            <div>
              <div className="text-sm font-medium text-text-primary">Auto-Link Available</div>
              <p className="text-xs text-text-muted mt-1">This deviation can be automatically linked to affected batch records and in-process documents.</p>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <FormField label="Severity" required>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {severityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateField('severity', opt.value)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formData.severity === opt.value
                      ? opt.value === 'critical' ? 'bg-red-500/20 border-red-500 text-red-400'
                        : opt.value === 'major' ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                        : 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-surface-card border-border text-text-secondary hover:border-border/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Patient Safety Impact">
              <SelectField 
                value={formData.patientSafetyImpact} 
                onChange={(v) => updateField('patientSafetyImpact', v)} 
                options={productImpactOptions}
              />
            </FormField>
            <FormField label="Regulatory Impact">
              <SelectField 
                value={formData.regulatoryImpact} 
                onChange={(v) => updateField('regulatoryImpact', v)} 
                options={regulatoryImpactOptions}
              />
            </FormField>
          </div>
          {formData.severity === 'critical' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-red-400">Critical Deviation</div>
                <p className="text-xs text-text-muted mt-1">This will trigger immediate notifications to QA leadership and may require regulatory reporting within 24 hours.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="text-sm text-text-secondary mb-2">Document any immediate actions taken to contain or address the deviation.</div>
          
          {formData.immediateActions.length > 0 && (
            <div className="space-y-2 mb-4">
              {formData.immediateActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-surface-card rounded-lg border border-border">
                  <Check className="w-4 h-4 text-accent-green mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{action.description}</p>
                    <p className="text-xs text-text-muted mt-1">By: {action.takenBy}</p>
                  </div>
                  <button onClick={() => removeAction(idx)} className="p-1 hover:bg-surface rounded">
                    <Trash2 className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-surface rounded-lg border border-border p-4 space-y-3">
            <FormField label="Action Description">
              <TextAreaField 
                value={newAction.description} 
                onChange={(v) => setNewAction(prev => ({ ...prev, description: v }))} 
                placeholder="What action was taken?"
                rows={2}
              />
            </FormField>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <FormField label="Taken By">
                  <TextField 
                    value={newAction.takenBy} 
                    onChange={(v) => setNewAction(prev => ({ ...prev, takenBy: v }))} 
                    placeholder="Name"
                  />
                </FormField>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={addImmediateAction}
                disabled={!newAction.description || !newAction.takenBy}
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div className="bg-surface-card rounded-lg p-4 mt-6">
            <h3 className="text-sm font-medium text-text-primary mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">Title:</span> <span className="text-text-primary">{formData.title}</span></div>
              <div><span className="text-text-muted">Type:</span> <span className="text-text-primary capitalize">{formData.deviationType}</span></div>
              <div><span className="text-text-muted">Category:</span> <span className="text-text-primary capitalize">{formData.category}</span></div>
              <div><span className="text-text-muted">Severity:</span> <Badge color={formData.severity === 'critical' ? 'red' : formData.severity === 'major' ? 'orange' : 'amber'} size="xs">{formData.severity}</Badge></div>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================================
// NEW CAPA MODAL
// ============================================================================

interface NewCAPAModalFormData {
  title: string;
  capaType: string;
  source: string;
  linkedRecordNumber: string;
  severity: string;
  priority: string;
  department: string;
  ownerName: string;
  assigneeName: string;
  targetCompletionDate: string;
  description: string;
  affectedProcesses: string;
}

interface NewCAPAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewCAPAInput) => void;
}

export function NewCAPAModal({ isOpen, onClose, onCreate }: NewCAPAModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<NewCAPAModalFormData>({
    title: '',
    capaType: 'corrective' as CAPAType,
    source: 'deviation' as CAPASource,
    linkedRecordNumber: '',
    severity: 'minor' as QMSSeverity,
    priority: 'medium' as QMSPriority,
    department: 'quality-assurance' as QMSDepartment,
    ownerName: '',
    assigneeName: '',
    targetCompletionDate: '',
    description: '',
    affectedProcesses: '',
  });

  if (!isOpen) return null;

  const updateField = <K extends keyof NewCAPAModalFormData>(field: K, value: NewCAPAModalFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    (onCreate as (d: any) => void)({
      title: formData.title,
      capaType: formData.capaType,
      source: formData.source,
      sourceReference: formData.linkedRecordNumber || undefined,
      severity: formData.severity,
      priority: formData.priority,
      department: formData.department,
      ownerName: formData.ownerName,
      assigneeName: formData.assigneeName,
      targetCompletionDate: formData.targetCompletionDate,
      description: formData.description,
    });
    onClose();
    setStep(1);
    setFormData({
      title: '', capaType: 'corrective', source: 'deviation', linkedRecordNumber: '',
      severity: 'minor', priority: 'medium', department: 'quality-assurance',
      ownerName: '', assigneeName: '', targetCompletionDate: '', description: '', affectedProcesses: '',
    });
  };

  const canProceed = () => {
    if (step === 1) return formData.title && formData.capaType && formData.source;
    if (step === 2) return formData.severity && formData.priority;
    if (step === 3) return formData.ownerName && formData.targetCompletionDate;
    return true;
  };

  const steps = ['Basic Info', 'Classification', 'Assignment', 'Scope'];

  return (
    <ModalWrapper
      title="New CAPA"
      icon={<Shield className="w-5 h-5 text-blue-400" />}
      onClose={onClose}
      footer={
        <>
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()} 
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step < 4 ? (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue →
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSubmit}>
                <Check className="w-4 h-4 mr-1" /> Create CAPA
              </Button>
            )}
          </div>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Title" required>
            <TextField 
              value={formData.title} 
              onChange={(v) => updateField('title', v)} 
              placeholder="Brief description of the corrective/preventive action"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="CAPA Type" required>
              <SelectField 
                value={formData.capaType} 
                onChange={(v) => updateField('capaType', v)} 
                options={capaTypeOptions}
              />
            </FormField>
            <FormField label="Source" required>
              <SelectField 
                value={formData.source} 
                onChange={(v) => updateField('source', v)} 
                options={capaSourceOptions}
              />
            </FormField>
          </div>
          {['deviation', 'audit-finding', 'complaint'].includes(formData.source) && (
            <FormField label="Linked Record Number" hint="Reference to the source record">
              <TextField 
                value={formData.linkedRecordNumber} 
                onChange={(v) => updateField('linkedRecordNumber', v)} 
                placeholder="e.g., DEV-2024-0042"
              />
            </FormField>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormField label="Severity" required>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {severityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateField('severity', opt.value)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formData.severity === opt.value
                      ? opt.value === 'critical' ? 'bg-red-500/20 border-red-500 text-red-400'
                        : opt.value === 'major' ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                        : 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-surface-card border-border text-text-secondary hover:border-border/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Priority" required>
            <div className="grid grid-cols-4 gap-3">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateField('priority', opt.value)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formData.priority === opt.value
                      ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                      : 'bg-surface-card border-border text-text-secondary hover:border-border/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Department" required>
            <SelectField 
              value={formData.department} 
              onChange={(v) => updateField('department', v)} 
              options={departmentOptions}
            />
          </FormField>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Owner" required hint="Person accountable for CAPA completion">
              <TextField 
                value={formData.ownerName} 
                onChange={(v) => updateField('ownerName', v)} 
                placeholder="e.g., Jane Smith"
              />
            </FormField>
            <FormField label="Assignee" hint="Person responsible for investigation">
              <TextField 
                value={formData.assigneeName} 
                onChange={(v) => updateField('assigneeName', v)} 
                placeholder="e.g., John Doe"
              />
            </FormField>
          </div>
          <FormField label="Target Completion Date" required>
            <TextField 
              type="date"
              value={formData.targetCompletionDate} 
              onChange={(v) => updateField('targetCompletionDate', v)}
            />
          </FormField>
          <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-4 flex items-start gap-3">
            <Calendar className="w-5 h-5 text-accent-purple mt-0.5" />
            <div>
              <div className="text-sm font-medium text-text-primary">Timeline Guidance</div>
              <p className="text-xs text-text-muted mt-1">Critical CAPAs: 30 days • Major: 60 days • Minor: 90 days</p>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <FormField label="Problem Statement" hint="Describe the issue this CAPA addresses">
            <TextAreaField 
              value={formData.description} 
              onChange={(v) => updateField('description', v)} 
              placeholder="Detailed description of the problem or improvement opportunity..."
              rows={4}
            />
          </FormField>
          <FormField label="Affected Processes" hint="Processes, systems, or areas impacted">
            <TextAreaField 
              value={formData.affectedProcesses} 
              onChange={(v) => updateField('affectedProcesses', v)} 
              placeholder="List affected processes, SOPs, or systems..."
              rows={2}
            />
          </FormField>

          <div className="bg-surface-card rounded-lg p-4 mt-6">
            <h3 className="text-sm font-medium text-text-primary mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">Title:</span> <span className="text-text-primary">{formData.title}</span></div>
              <div><span className="text-text-muted">Type:</span> <span className="text-text-primary capitalize">{formData.capaType}</span></div>
              <div><span className="text-text-muted">Severity:</span> <Badge color={formData.severity === 'critical' ? 'red' : formData.severity === 'major' ? 'orange' : 'amber'} size="xs">{formData.severity}</Badge></div>
              <div><span className="text-text-muted">Owner:</span> <span className="text-text-primary">{formData.ownerName}</span></div>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================================
// NEW AUDIT MODAL
// ============================================================================

interface NewAuditModalFormData {
  title: string;
  auditType: string;
  scope: string;
  department: string;
  scheduledStart: string;
  scheduledEnd: string;
  leadAuditor: string;
  teamMembers: string;
  objectives: string;
}

interface NewAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewAuditInput) => void;
}

export function NewAuditModal({ isOpen, onClose, onCreate }: NewAuditModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<NewAuditModalFormData>({
    title: '',
    auditType: 'internal' as AuditType,
    scope: 'system',
    department: 'quality-assurance' as QMSDepartment,
    scheduledStart: '',
    scheduledEnd: '',
    leadAuditor: '',
    teamMembers: '',
    objectives: '',
  });

  if (!isOpen) return null;

  const updateField = <K extends keyof NewAuditModalFormData>(field: K, value: NewAuditModalFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    (onCreate as (d: any) => void)({
      title: formData.title,
      auditType: formData.auditType,
      scope: formData.scope,
      department: formData.department,
      scheduledStart: formData.scheduledStart,
      scheduledEnd: formData.scheduledEnd,
      leadAuditor: formData.leadAuditor,
    });
    onClose();
    setStep(1);
    setFormData({
      title: '', auditType: 'internal', scope: 'system', department: 'quality-assurance',
      scheduledStart: '', scheduledEnd: '', leadAuditor: '', teamMembers: '', objectives: '',
    });
  };

  const canProceed = () => {
    if (step === 1) return formData.title && formData.auditType && formData.scope;
    if (step === 2) return formData.scheduledStart && formData.scheduledEnd;
    if (step === 3) return formData.leadAuditor;
    return true;
  };

  const steps = ['Audit Info', 'Schedule', 'Team'];

  return (
    <ModalWrapper
      title="New Audit"
      icon={<ClipboardCheck className="w-5 h-5 text-purple-400" />}
      onClose={onClose}
      footer={
        <>
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()} 
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue →
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSubmit}>
                <Check className="w-4 h-4 mr-1" /> Schedule Audit
              </Button>
            )}
          </div>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Audit Title" required>
            <TextField 
              value={formData.title} 
              onChange={(v) => updateField('title', v)} 
              placeholder="e.g., Annual Internal Quality Audit 2025"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Audit Type" required>
              <SelectField 
                value={formData.auditType} 
                onChange={(v) => updateField('auditType', v)} 
                options={auditTypeOptions}
              />
            </FormField>
            <FormField label="Scope" required>
              <SelectField 
                value={formData.scope} 
                onChange={(v) => updateField('scope', v)} 
                options={auditScopeOptions}
              />
            </FormField>
          </div>
          <FormField label="Department" required>
            <SelectField 
              value={formData.department} 
              onChange={(v) => updateField('department', v)} 
              options={departmentOptions}
            />
          </FormField>
          <FormField label="Objectives" hint="Key objectives for this audit">
            <TextAreaField 
              value={formData.objectives} 
              onChange={(v) => updateField('objectives', v)} 
              placeholder="List the primary objectives..."
              rows={3}
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Start Date" required>
              <TextField 
                type="date"
                value={formData.scheduledStart} 
                onChange={(v) => updateField('scheduledStart', v)}
              />
            </FormField>
            <FormField label="End Date" required>
              <TextField 
                type="date"
                value={formData.scheduledEnd} 
                onChange={(v) => updateField('scheduledEnd', v)}
              />
            </FormField>
          </div>
          {formData.scheduledStart && formData.scheduledEnd && (
            <div className="bg-surface-card rounded-lg p-4 flex items-center gap-4">
              <Calendar className="w-8 h-8 text-accent-purple" />
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {Math.ceil((new Date(formData.scheduledEnd).getTime() - new Date(formData.scheduledStart).getTime()) / (1000 * 60 * 60 * 24)) + 1} day audit
                </div>
                <div className="text-xs text-text-muted">
                  {new Date(formData.scheduledStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} – {new Date(formData.scheduledEnd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          )}
          <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent-blue mt-0.5" />
            <div>
              <div className="text-sm font-medium text-text-primary">Resource Availability</div>
              <p className="text-xs text-text-muted mt-1">The system will check auditor availability and suggest optimal scheduling.</p>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <FormField label="Lead Auditor" required>
            <TextField 
              value={formData.leadAuditor} 
              onChange={(v) => updateField('leadAuditor', v)} 
              placeholder="e.g., Jane Smith, QA Director"
            />
          </FormField>
          <FormField label="Team Members" hint="Additional auditors (optional)">
            <TextAreaField 
              value={formData.teamMembers} 
              onChange={(v) => updateField('teamMembers', v)} 
              placeholder="List team members, one per line..."
              rows={3}
            />
          </FormField>

          <div className="bg-surface-card rounded-lg p-4 mt-6">
            <h3 className="text-sm font-medium text-text-primary mb-3">Audit Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">Title:</span> <span className="text-text-primary">{formData.title}</span></div>
              <div><span className="text-text-muted">Type:</span> <Badge color="purple" size="xs">{formData.auditType}</Badge></div>
              <div><span className="text-text-muted">Dates:</span> <span className="text-text-primary">{formData.scheduledStart} – {formData.scheduledEnd}</span></div>
              <div><span className="text-text-muted">Lead:</span> <span className="text-text-primary">{formData.leadAuditor}</span></div>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================================
// NEW CHANGE CONTROL MODAL
// ============================================================================

interface NewChangeControlModalFormData {
  title: string;
  changeType: string;
  category: string;
  priority: string;
  department: string;
  description: string;
  justification: string;
  affectedSystems: string;
  requestorName: string;
  ownerName: string;
}

interface NewChangeControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewChangeControlInput) => void;
}

export function NewChangeControlModal({ isOpen, onClose, onCreate }: NewChangeControlModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<NewChangeControlModalFormData>({
    title: '',
    changeType: 'process',
    category: 'minor',
    priority: 'medium' as QMSPriority,
    department: 'manufacturing' as QMSDepartment,
    description: '',
    justification: '',
    affectedSystems: '',
    requestorName: '',
    ownerName: '',
  });

  if (!isOpen) return null;

  const updateField = <K extends keyof NewChangeControlModalFormData>(field: K, value: NewChangeControlModalFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    (onCreate as (d: any) => void)({
      title: formData.title,
      changeType: formData.changeType,
      category: formData.category,
      priority: formData.priority,
      department: formData.department,
      description: formData.description,
      justification: formData.justification,
      requestorName: formData.requestorName,
      ownerName: formData.ownerName,
    });
    onClose();
    setStep(1);
    setFormData({
      title: '', changeType: 'process', category: 'minor', priority: 'medium',
      department: 'manufacturing', description: '', justification: '', affectedSystems: '',
      requestorName: '', ownerName: '',
    });
  };

  const canProceed = () => {
    if (step === 1) return formData.title && formData.changeType && formData.category;
    if (step === 2) return formData.description;
    if (step === 3) return formData.requestorName && formData.ownerName;
    return true;
  };

  const steps = ['Change Info', 'Scope', 'Assignment'];

  return (
    <ModalWrapper
      title="New Change Control"
      icon={<FileText className="w-5 h-5 text-violet-400" />}
      onClose={onClose}
      footer={
        <>
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()} 
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            {step > 1 ? '← Back' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Continue →
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleSubmit}>
                <Check className="w-4 h-4 mr-1" /> Submit Change
              </Button>
            )}
          </div>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Change Title" required>
            <TextField 
              value={formData.title} 
              onChange={(v) => updateField('title', v)} 
              placeholder="e.g., Upgrade Tablet Press Control System"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Change Type" required>
              <SelectField 
                value={formData.changeType} 
                onChange={(v) => updateField('changeType', v)} 
                options={changeTypeOptions}
              />
            </FormField>
            <FormField label="Category" required>
              <SelectField 
                value={formData.category} 
                onChange={(v) => updateField('category', v)} 
                options={changeCategoryOptions}
              />
            </FormField>
          </div>
          <FormField label="Priority" required>
            <div className="grid grid-cols-4 gap-3">
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateField('priority', opt.value)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    formData.priority === opt.value
                      ? 'bg-accent-blue/20 border-accent-blue text-accent-blue'
                      : 'bg-surface-card border-border text-text-secondary hover:border-border/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormField label="Description" required hint="Describe the proposed change in detail">
            <TextAreaField 
              value={formData.description} 
              onChange={(v) => updateField('description', v)} 
              placeholder="Detailed description of what will change..."
              rows={4}
            />
          </FormField>
          <FormField label="Justification" hint="Why is this change needed?">
            <TextAreaField 
              value={formData.justification} 
              onChange={(v) => updateField('justification', v)} 
              placeholder="Business or technical justification..."
              rows={3}
            />
          </FormField>
          <FormField label="Affected Systems/Processes" hint="What will be impacted?">
            <TextAreaField 
              value={formData.affectedSystems} 
              onChange={(v) => updateField('affectedSystems', v)} 
              placeholder="List affected systems, processes, documents..."
              rows={2}
            />
          </FormField>
          {formData.category === 'major' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
              <FileWarning className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-400">Major Change</div>
                <p className="text-xs text-text-muted mt-1">This change will require full impact assessment and may need regulatory notification.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Requestor" required>
              <TextField 
                value={formData.requestorName} 
                onChange={(v) => updateField('requestorName', v)} 
                placeholder="Person requesting the change"
              />
            </FormField>
            <FormField label="Owner" required hint="Person accountable for implementation">
              <TextField 
                value={formData.ownerName} 
                onChange={(v) => updateField('ownerName', v)} 
                placeholder="Change owner"
              />
            </FormField>
          </div>
          <FormField label="Department" required>
            <SelectField 
              value={formData.department} 
              onChange={(v) => updateField('department', v)} 
              options={departmentOptions}
            />
          </FormField>

          <div className="bg-surface-card rounded-lg p-4 mt-6">
            <h3 className="text-sm font-medium text-text-primary mb-3">Change Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-text-muted">Title:</span> <span className="text-text-primary">{formData.title}</span></div>
              <div><span className="text-text-muted">Type:</span> <span className="text-text-primary capitalize">{formData.changeType}</span></div>
              <div><span className="text-text-muted">Category:</span> <Badge color={formData.category === 'major' ? 'orange' : 'slate'} size="xs">{formData.category}</Badge></div>
              <div><span className="text-text-muted">Owner:</span> <span className="text-text-primary">{formData.ownerName}</span></div>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================================
// ASSIGN TRAINING MODAL
// ============================================================================

interface AssignTrainingModalFormData {
  userName: string;
  userId: string;
  courseTitle: string;
  courseId: string;
  dueDate: string;
  notes: string;
}

export interface AssignTrainingInput {
  userName: string;
  userId: string;
  courseTitle: string;
  courseId: string;
  dueDate: string;
}

interface AssignTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (data: AssignTrainingInput) => void;
}

export function AssignTrainingModal({ isOpen, onClose, onAssign }: AssignTrainingModalProps) {
  const [formData, setFormData] = useState<AssignTrainingModalFormData>({
    userName: '',
    userId: '',
    courseTitle: '',
    courseId: '',
    dueDate: '',
    notes: '',
  });

  if (!isOpen) return null;

  const updateField = <K extends keyof AssignTrainingModalFormData>(field: K, value: AssignTrainingModalFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onAssign({
      userName: formData.userName,
      userId: formData.userId || `user-${Date.now()}`,
      courseTitle: formData.courseTitle,
      courseId: formData.courseId || `course-${Date.now()}`,
      dueDate: formData.dueDate,
    });
    onClose();
    setFormData({ userName: '', userId: '', courseTitle: '', courseId: '', dueDate: '', notes: '' });
  };

  const canSubmit = formData.userName && formData.courseTitle && formData.dueDate;

  const courseOptions = [
    { value: 'gmp-fundamentals', label: 'GMP Fundamentals' },
    { value: 'data-integrity', label: 'Data Integrity Essentials' },
    { value: 'deviation-management', label: 'Deviation Management' },
    { value: 'capa-training', label: 'CAPA Process Training' },
    { value: 'document-control', label: 'Document Control SOP' },
    { value: 'change-control', label: 'Change Control Process' },
    { value: 'audit-readiness', label: 'Audit Readiness' },
    { value: 'safety-pharmacovigilance', label: 'Safety & Pharmacovigilance' },
  ];

  return (
    <ModalWrapper
      title="Assign Training"
      icon={<BookOpen className="w-5 h-5 text-cyan-400" />}
      onClose={onClose}
      footer={
        <>
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            <Check className="w-4 h-4 mr-1" /> Assign Training
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Employee Name" required>
          <TextField 
            value={formData.userName} 
            onChange={(v) => updateField('userName', v)} 
            placeholder="e.g., John Smith"
          />
        </FormField>
        <FormField label="Course" required>
          <SelectField 
            value={formData.courseTitle} 
            onChange={(v) => updateField('courseTitle', v)} 
            options={courseOptions}
            placeholder="Select a course..."
          />
        </FormField>
        <FormField label="Due Date" required>
          <TextField 
            type="date"
            value={formData.dueDate} 
            onChange={(v) => updateField('dueDate', v)}
          />
        </FormField>
        <FormField label="Notes" hint="Optional notes for the assignee">
          <TextAreaField 
            value={formData.notes} 
            onChange={(v) => updateField('notes', v)} 
            placeholder="Additional instructions or context..."
            rows={2}
          />
        </FormField>
        
        <div className="bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg p-4 flex items-start gap-3">
          <Users className="w-5 h-5 text-accent-cyan mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">Bulk Assignment</div>
            <p className="text-xs text-text-muted mt-1">Need to assign to multiple employees? Use the Training Matrix view for bulk assignments.</p>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
