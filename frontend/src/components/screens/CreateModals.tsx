

import { useState, useEffect } from 'react';
import { useProducts } from '@/stores/products-store';
import { useProductFilter } from '@/hooks/useProductFilter';
import { X, Check, ChevronRight, Building2, Users, Key, Shield, Settings, FileCheck, 
  MapPin, Calendar, Beaker, Target, FlaskConical, Microscope, Languages, Palette, 
  Package, Box, Tag, Globe, Plus, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// v0.42.23: Input Types for Modal Callbacks
// ============================================================================

export interface RolePermissionsInput {
  roleName: string;
  description: string;
  department: string;
  basePermission: string;
  modules: Record<string, string>;
  permissions?: Record<string, unknown>;
}

export interface SettingsInput {
  companyName: string;
  primaryColor?: string;
  dateFormat: string;
  defaultTimezone?: string;
  notificationEmail?: string;
  timezone?: string;
  sessionTimeout?: string;
  twoFactorRequired?: boolean;
  emailNotifications?: boolean;
  auditRetention?: string;
  autoSave?: boolean;
}

export interface AddSiteInput {
  siteName: string;
  siteNumber: string;
  country: string;
  investigator: string;
  targetEnrollment: number;
  status: string;
  activationDate: string;
  studyId?: string;
}

export interface AddLanguageInput {
  language: string;
  region?: string;
  translator?: string;
  deadline?: string;
  labelTypes?: string[];
  translationVendor?: string;
  targetDate?: string;
}

export interface NewArtworkInput {
  artworkName?: string;
  artworkType?: string;
  product?: string;
  format?: string;
  description?: string;
  name?: string;
  type?: string;
  market?: string;
  labelVersion?: string;
  languages?: string[];
  dimensions?: string;
  notes?: string;
}

export interface NewSKUInput {
  skuCode?: string;
  productName?: string;
  presentation?: string;
  packSize?: string;
  targetMarkets?: string[];
  status?: string;
  market?: string;
  product?: string;
  strength?: string;
  packType?: string;
  description?: string;
  ndc?: string;
  gtin?: string;
  labelVersion?: string;
}

export interface NewTargetInput {
  target: string;
  targetClass: string;
  indication: string;
  modality: string;
  team: string;
  rationale: string;
}

export interface NewPreclinicalStudyInput {
  title: string;
  type?: string;
  species?: string;
  duration?: string;
  objectives?: string;
  cro?: string;
  studyNumber?: string;
  studyType?: string;
  product?: string;
  glpCompliant?: boolean;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// SHARED COMPONENTS (reused from QMSCreateModals pattern)
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

// Admin - Roles
const rolePermissionOptions = [
  { value: 'read', label: 'Read Only' },
  { value: 'write', label: 'Read/Write' },
  { value: 'admin', label: 'Full Admin' },
  { value: 'custom', label: 'Custom' },
];

const departmentOptions = [
  { value: 'regulatory', label: 'Regulatory Affairs' },
  { value: 'clinical', label: 'Clinical Operations' },
  { value: 'quality', label: 'Quality Assurance' },
  { value: 'safety', label: 'Drug Safety' },
  { value: 'cmc', label: 'CMC' },
  { value: 'medical', label: 'Medical Affairs' },
  { value: 'rd', label: 'R&D' },
  { value: 'it', label: 'IT' },
];

// CTMS - Sites
const siteTypeOptions = [
  { value: 'academic-medical-center', label: 'Academic Medical Center' },
  { value: 'community-hospital', label: 'Community Hospital' },
  { value: 'private-practice', label: 'Private Practice' },
  { value: 'research-center', label: 'Research Center' },
  { value: 'specialty-clinic', label: 'Specialty Clinic' },
];

const countryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'AU', label: 'Australia' },
  { value: 'BR', label: 'Brazil' },
  { value: 'IN', label: 'India' },
  { value: 'CN', label: 'China' },
];

// Labeling
const languageOptions = [
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'it', label: 'Italian', flag: '🇮🇹' },
  { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { value: 'ko', label: 'Korean', flag: '🇰🇷' },
  { value: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { value: 'pl', label: 'Polish', flag: '🇵🇱' },
];

const artworkTypeOptions = [
  { value: 'carton', label: 'Carton' },
  { value: 'label', label: 'Label' },
  { value: 'insert', label: 'Insert (PIL)' },
  { value: 'blister', label: 'Blister' },
  { value: 'bottle', label: 'Bottle Label' },
  { value: 'box', label: 'Outer Box' },
];

const skuPackTypeOptions = [
  { value: 'blister-30', label: 'Blister Pack (30 tablets)' },
  { value: 'blister-60', label: 'Blister Pack (60 tablets)' },
  { value: 'blister-90', label: 'Blister Pack (90 tablets)' },
  { value: 'bottle-30', label: 'Bottle (30 count)' },
  { value: 'bottle-60', label: 'Bottle (60 count)' },
  { value: 'bottle-100', label: 'Bottle (100 count)' },
  { value: 'vial-single', label: 'Vial (Single)' },
  { value: 'vial-pack', label: 'Vial (Multi-pack)' },
  { value: 'prefilled-syringe', label: 'Pre-filled Syringe' },
  { value: 'autoinjector', label: 'Autoinjector' },
];

// Research
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

const stageOptions = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'lead-opt', label: 'Lead Optimization' },
  { value: 'preclinical', label: 'Preclinical' },
  { value: 'ind-enabling', label: 'IND-Enabling' },
  { value: 'clinical', label: 'Clinical' },
];

const studyTypeOptions = [
  { value: 'pk', label: 'Pharmacokinetics (PK)' },
  { value: 'pd', label: 'Pharmacodynamics (PD)' },
  { value: 'tox-acute', label: 'Acute Toxicology' },
  { value: 'tox-repeat', label: 'Repeat-Dose Toxicology' },
  { value: 'tox-chronic', label: 'Chronic Toxicology' },
  { value: 'genotox', label: 'Genotoxicity' },
  { value: 'safety-pharm', label: 'Safety Pharmacology' },
  { value: 'carcinogenicity', label: 'Carcinogenicity' },
  { value: 'repro-tox', label: 'Reproductive Toxicology' },
  { value: 'immunogenicity', label: 'Immunogenicity' },
];

const speciesOptions = [
  { value: 'mouse', label: 'Mouse' },
  { value: 'rat', label: 'Rat' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'dog', label: 'Dog' },
  { value: 'nhr', label: 'Non-Human Primate (NHP)' },
  { value: 'minipig', label: 'Minipig' },
  { value: 'in-vitro', label: 'In Vitro' },
];

// ============================================================================
// ADMIN MODALS
// ============================================================================

interface RolesPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: RolePermissionsInput) => void;
}

export function RolesPermissionsModal({ isOpen, onClose, onCreate }: RolesPermissionsModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    roleName: '',
    description: '',
    department: '',
    basePermission: 'read',
    modules: {} as Record<string, string>,
  });

  const steps = ['Role Info', 'Permissions', 'Review'];

  const modules = [
    { id: 'submissions', name: 'Submissions', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'documents', name: 'Document Control', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'clinical', name: 'Clinical (CTMS)', icon: <Users className="w-4 h-4" /> },
    { id: 'safety', name: 'Safety', icon: <Shield className="w-4 h-4" /> },
    { id: 'quality', name: 'Quality (QMS)', icon: <Shield className="w-4 h-4" /> },
    { id: 'labeling', name: 'Labeling', icon: <Tag className="w-4 h-4" /> },
    { id: 'research', name: 'Research', icon: <Beaker className="w-4 h-4" /> },
    { id: 'admin', name: 'Administration', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleCreate = () => {
    onCreate(formData);
    onClose();
    setStep(1);
    setFormData({ roleName: '', description: '', department: '', basePermission: 'read', modules: {} });
  };

  const isValid = step === 1 
    ? formData.roleName && formData.department 
    : step === 2 
    ? Object.keys(formData.modules).length > 0 
    : true;

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="Create New Role" 
      icon={<Key className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button 
            variant="primary" 
            onClick={step < 3 ? () => setStep(step + 1) : handleCreate}
            disabled={!isValid}
          >
            {step < 3 ? 'Continue' : 'Create Role'}
          </Button>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Role Name" required>
            <TextField 
              value={formData.roleName} 
              onChange={(v) => setFormData({ ...formData, roleName: v })}
              placeholder="e.g., Regulatory Specialist"
            />
          </FormField>
          <FormField label="Department" required>
            <SelectField 
              value={formData.department}
              onChange={(v) => setFormData({ ...formData, department: v })}
              options={departmentOptions}
              placeholder="Select department..."
            />
          </FormField>
          <FormField label="Description">
            <TextAreaField 
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="Describe the role's responsibilities..."
            />
          </FormField>
          <FormField label="Base Permission Level" required hint="Sets the default permission for all modules">
            <SelectField 
              value={formData.basePermission}
              onChange={(v) => setFormData({ ...formData, basePermission: v })}
              options={rolePermissionOptions}
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary mb-4">Configure module-specific permissions:</p>
          <div className="space-y-3">
            {modules.map(mod => (
              <div key={mod.id} className="flex items-center justify-between p-3 bg-surface-card rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="text-text-muted">{mod.icon}</div>
                  <span className="text-sm text-text-primary">{mod.name}</span>
                </div>
                <select 
                  value={formData.modules[mod.id] || formData.basePermission}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    modules: { ...formData.modules, [mod.id]: e.target.value }
                  })}
                  className="px-3 py-1.5 bg-surface border border-border rounded text-sm text-text-primary"
                >
                  <option value="none">No Access</option>
                  <option value="read">Read Only</option>
                  <option value="write">Read/Write</option>
                  <option value="admin">Full Admin</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-text-primary mb-3">Role Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div><span className="text-text-muted">Name:</span> <span className="text-text-primary">{formData.roleName}</span></div>
              <div><span className="text-text-muted">Department:</span> <span className="text-text-primary">{departmentOptions.find(d => d.value === formData.department)?.label}</span></div>
            </div>
            {formData.description && (
              <p className="text-sm text-text-secondary mt-3">{formData.description}</p>
            )}
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-text-primary mb-3">Permissions</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {modules.map(mod => (
                <div key={mod.id} className="flex items-center justify-between">
                  <span className="text-text-muted">{mod.name}:</span>
                  <Badge color={
                    (formData.modules[mod.id] || formData.basePermission) === 'admin' ? 'green' :
                    (formData.modules[mod.id] || formData.basePermission) === 'write' ? 'blue' :
                    (formData.modules[mod.id] || formData.basePermission) === 'read' ? 'amber' : 'slate'
                  } size="xs">
                    {(formData.modules[mod.id] || formData.basePermission).replace(/-/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuditLogModal({ isOpen, onClose }: AuditLogModalProps) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [eventType, setEventType] = useState('');
  const [user, setUser] = useState('');
  const [auditEntries, setAuditEntries] = useState([
    { id: 'seed-1', timestamp: '2025-01-10 14:32:05', user: 'Dr. Sarah Chen', action: 'Document Approved', module: 'Submissions', details: 'Approved CSR for LIG-2847', type: 'document' },
    { id: 'seed-2', timestamp: '2025-01-10 13:45:22', user: 'James Liu', action: 'Status Changed', module: 'Safety', details: 'ICSR-2025-0088 submitted to EMA', type: 'document' },
  ]);
  const [total, setTotal] = useState(2);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/audit')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (data.entries && data.entries.length > 0) {
          setAuditEntries(data.entries.map((e: any) => ({
            id: e.id,
            timestamp: new Date(e.timestamp).toLocaleString(),
            user: e.user,
            action: e.action,
            module: e.module,
            details: e.details,
            type: e.type,
          })));
          setTotal(data.total || data.entries.length);
        }
      })
      .catch(() => { /* keep seed entries */ })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="Audit Log" 
      icon={<FileCheck className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="secondary" icon={<FileCheck className="w-4 h-4" />} onClick={async () => { try { const r = await fetch('/api/audit/export?format=csv'); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'audit-log.csv'; a.click(); URL.revokeObjectURL(u); } catch { toast.error('Export failed'); } }}>Export Log</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <FormField label="Start Date">
            <TextField type="date" value={dateRange.start} onChange={(v) => setDateRange({ ...dateRange, start: v })} />
          </FormField>
          <FormField label="End Date">
            <TextField type="date" value={dateRange.end} onChange={(v) => setDateRange({ ...dateRange, end: v })} />
          </FormField>
          <FormField label="Event Type">
            <SelectField 
              value={eventType}
              onChange={setEventType}
              options={[
                { value: 'login', label: 'Login/Logout' },
                { value: 'create', label: 'Record Created' },
                { value: 'update', label: 'Record Updated' },
                { value: 'delete', label: 'Record Deleted' },
                { value: 'approve', label: 'Approval' },
                { value: 'permission', label: 'Permission Change' },
              ]}
              placeholder="All Events"
            />
          </FormField>
        </div>

        {/* Log Entries */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-card border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-text-muted">Timestamp</th>
                <th className="text-left p-3 text-xs font-medium text-text-muted">User</th>
                <th className="text-left p-3 text-xs font-medium text-text-muted">Action</th>
                <th className="text-left p-3 text-xs font-medium text-text-muted">Module</th>
                <th className="text-left p-3 text-xs font-medium text-text-muted">Details</th>
              </tr>
            </thead>
            <tbody>
              {auditEntries.map(entry => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-surface-card/50">
                  <td className="p-3 text-xs text-text-muted font-mono">{entry.timestamp}</td>
                  <td className="p-3 text-sm text-text-primary">{entry.user}</td>
                  <td className="p-3"><Badge color="blue" size="xs">{entry.action}</Badge></td>
                  <td className="p-3 text-sm text-text-secondary">{entry.module}</td>
                  <td className="p-3 text-sm text-text-secondary truncate max-w-[200px]">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <p className="text-xs text-text-muted text-center">
          {loading ? 'Loading…' : `Showing ${auditEntries.length} of ${total} entries`}
        </p>
      </div>
    </ModalWrapper>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SettingsInput) => void;
}

export function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  const [settings, setSettings] = useState({
    companyName: 'Ligature Therapeutics',
    timezone: 'America/New_York',
    dateFormat: 'YYYY-MM-DD',
    sessionTimeout: '30',
    twoFactorRequired: true,
    emailNotifications: true,
    auditRetention: '7',
    autoSave: true,
  });

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="System Settings" 
      icon={<Settings className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onSave(settings); onClose(); }}>Save Settings</Button>
        </>
      }
    >
      <div className="space-y-4 md:space-y-6">
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">General</h3>
          <div className="space-y-4">
            <FormField label="Company Name">
              <TextField value={settings.companyName} onChange={(v) => setSettings({ ...settings, companyName: v })} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField label="Timezone">
                <SelectField 
                  value={settings.timezone}
                  onChange={(v) => setSettings({ ...settings, timezone: v })}
                  options={[
                    { value: 'America/New_York', label: 'Eastern Time (ET)' },
                    { value: 'America/Chicago', label: 'Central Time (CT)' },
                    { value: 'America/Denver', label: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                    { value: 'Europe/London', label: 'London (GMT)' },
                    { value: 'Europe/Paris', label: 'Central European (CET)' },
                    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
                  ]}
                />
              </FormField>
              <FormField label="Date Format">
                <SelectField 
                  value={settings.dateFormat}
                  onChange={(v) => setSettings({ ...settings, dateFormat: v })}
                  options={[
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
                  ]}
                />
              </FormField>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Security</h3>
          <div className="space-y-4">
            <FormField label="Session Timeout (minutes)">
              <SelectField 
                value={settings.sessionTimeout}
                onChange={(v) => setSettings({ ...settings, sessionTimeout: v })}
                options={[
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 hour' },
                  { value: '120', label: '2 hours' },
                ]}
              />
            </FormField>
            <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg border border-border">
              <div>
                <div className="text-sm text-text-primary">Two-Factor Authentication</div>
                <div className="text-xs text-text-muted">Require 2FA for all users</div>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, twoFactorRequired: !settings.twoFactorRequired })}
                className={`w-12 h-6 rounded-full transition-colors ${settings.twoFactorRequired ? 'bg-accent-green' : 'bg-surface'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${settings.twoFactorRequired ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">Data Management</h3>
          <div className="space-y-4">
            <FormField label="Audit Log Retention" hint="How long to keep audit log entries">
              <SelectField 
                value={settings.auditRetention}
                onChange={(v) => setSettings({ ...settings, auditRetention: v })}
                options={[
                  { value: '1', label: '1 year' },
                  { value: '3', label: '3 years' },
                  { value: '5', label: '5 years' },
                  { value: '7', label: '7 years' },
                  { value: '10', label: '10 years' },
                ]}
              />
            </FormField>
            <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg border border-border">
              <div>
                <div className="text-sm text-text-primary">Auto-Save</div>
                <div className="text-xs text-text-muted">Automatically save drafts every 30 seconds</div>
              </div>
              <button 
                onClick={() => setSettings({ ...settings, autoSave: !settings.autoSave })}
                className={`w-12 h-6 rounded-full transition-colors ${settings.autoSave ? 'bg-accent-green' : 'bg-surface'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${settings.autoSave ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ============================================================================
// CTMS MODALS
// ============================================================================

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: AddSiteInput) => void;
  studyId?: string;
}

export function AddSiteModal({ isOpen, onClose, onCreate, studyId }: AddSiteModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    siteNumber: '',
    institutionType: '',
    country: '',
    city: '',
    address: '',
    targetEnrollment: '',
    piName: '',
    piEmail: '',
    coordinatorName: '',
    coordinatorEmail: '',
  });

  const steps = ['Site Info', 'Location', 'Team'];

  const handleCreate = () => {
    onCreate({ ...formData, studyId } as any);
    onClose();
    setStep(1);
    setFormData({ name: '', siteNumber: '', institutionType: '', country: '', city: '', address: '', targetEnrollment: '', piName: '', piEmail: '', coordinatorName: '', coordinatorEmail: '' });
  };

  const isValid = step === 1 
    ? formData.name && formData.institutionType 
    : step === 2 
    ? formData.country && formData.city 
    : formData.piName;

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="Add Clinical Site" 
      icon={<Building2 className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button 
            variant="primary" 
            onClick={step < 3 ? () => setStep(step + 1) : handleCreate}
            disabled={!isValid}
          >
            {step < 3 ? 'Continue' : 'Add Site'}
          </Button>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Site Name" required>
            <TextField 
              value={formData.name} 
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="e.g., Massachusetts General Hospital"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Site Number">
              <TextField 
                value={formData.siteNumber}
                onChange={(v) => setFormData({ ...formData, siteNumber: v })}
                placeholder="e.g., SITE-001"
              />
            </FormField>
            <FormField label="Institution Type" required>
              <SelectField 
                value={formData.institutionType}
                onChange={(v) => setFormData({ ...formData, institutionType: v })}
                options={siteTypeOptions}
                placeholder="Select type..."
              />
            </FormField>
          </div>
          <FormField label="Target Enrollment" hint="Expected number of subjects at this site">
            <TextField 
              value={formData.targetEnrollment}
              onChange={(v) => setFormData({ ...formData, targetEnrollment: v })}
              placeholder="e.g., 25"
              type="number"
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Country" required>
              <SelectField 
                value={formData.country}
                onChange={(v) => setFormData({ ...formData, country: v })}
                options={countryOptions}
                placeholder="Select country..."
              />
            </FormField>
            <FormField label="City" required>
              <TextField 
                value={formData.city}
                onChange={(v) => setFormData({ ...formData, city: v })}
                placeholder="e.g., Boston"
              />
            </FormField>
          </div>
          <FormField label="Street Address">
            <TextAreaField 
              value={formData.address}
              onChange={(v) => setFormData({ ...formData, address: v })}
              placeholder="Full street address..."
              rows={2}
            />
          </FormField>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-surface-card border border-border rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-accent-blue" />
              <span className="text-sm font-medium text-text-primary">Principal Investigator</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField label="Name" required>
                <TextField 
                  value={formData.piName}
                  onChange={(v) => setFormData({ ...formData, piName: v })}
                  placeholder="Dr. Jane Smith"
                />
              </FormField>
              <FormField label="Email">
                <TextField 
                  value={formData.piEmail}
                  onChange={(v) => setFormData({ ...formData, piEmail: v })}
                  placeholder="jane.smith@hospital.org"
                  type="email"
                />
              </FormField>
            </div>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-primary">Study Coordinator</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField label="Name">
                <TextField 
                  value={formData.coordinatorName}
                  onChange={(v) => setFormData({ ...formData, coordinatorName: v })}
                  placeholder="John Doe"
                />
              </FormField>
              <FormField label="Email">
                <TextField 
                  value={formData.coordinatorEmail}
                  onChange={(v) => setFormData({ ...formData, coordinatorEmail: v })}
                  placeholder="john.doe@hospital.org"
                  type="email"
                />
              </FormField>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================================
// LABELING MODALS
// ============================================================================

interface AddLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: AddLanguageInput) => void;
}

export function AddLanguageModal({ isOpen, onClose, onCreate }: AddLanguageModalProps) {
  const [formData, setFormData] = useState({
    language: '',
    labelTypes: [] as string[],
    translationVendor: '',
    targetDate: '',
  });

  const labelTypeOptions = [
    { id: 'smpc', label: 'SmPC' },
    { id: 'pil', label: 'PIL' },
    { id: 'uspi', label: 'USPI' },
    { id: 'cmi', label: 'CMI' },
  ];

  const handleCreate = () => {
    onCreate(formData);
    onClose();
    setFormData({ language: '', labelTypes: [], translationVendor: '', targetDate: '' });
  };

  const toggleLabelType = (id: string) => {
    setFormData({
      ...formData,
      labelTypes: formData.labelTypes.includes(id) 
        ? formData.labelTypes.filter(t => t !== id)
        : [...formData.labelTypes, id]
    });
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="Add Translation Language" 
      icon={<Languages className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleCreate}
            disabled={!formData.language || formData.labelTypes.length === 0}
          >
            Add Language
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Language" required>
          <SelectField 
            value={formData.language}
            onChange={(v) => setFormData({ ...formData, language: v })}
            options={languageOptions.map(l => ({ value: l.value, label: `${l.flag} ${l?.label ?? ''}` }))}
            placeholder="Select language..."
          />
        </FormField>
        
        <FormField label="Label Types" required hint="Select which label types need translation">
          <div className="flex flex-wrap gap-2">
            {labelTypeOptions.map(lt => (
              <button
                key={lt.id}
                onClick={() => toggleLabelType(lt.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  formData.labelTypes.includes(lt.id)
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-card border border-border text-text-secondary hover:border-accent-blue/50'
                }`}
              >
                {lt.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Translation Vendor">
          <SelectField 
            value={formData.translationVendor}
            onChange={(v) => setFormData({ ...formData, translationVendor: v })}
            options={[
              { value: 'lionbridge', label: 'Lionbridge' },
              { value: 'transperfect', label: 'TransPerfect' },
              { value: 'rws', label: 'RWS' },
              { value: 'in-house', label: 'In-House' },
            ]}
            placeholder="Select vendor..."
          />
        </FormField>

        <FormField label="Target Completion Date">
          <TextField 
            type="date"
            value={formData.targetDate}
            onChange={(v) => setFormData({ ...formData, targetDate: v })}
          />
        </FormField>
      </div>
    </ModalWrapper>
  );
}

interface NewArtworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewArtworkInput) => void;
}

export function NewArtworkModal({ isOpen, onClose, onCreate }: NewArtworkModalProps) {
  const products = useProducts();
  const productOptions = products.map(p => ({ value: p.id, label: `${p.name}${p.brandName ? ' (' + p.brandName + ')' : ''}` }));
  const { selectedProductId } = useProductFilter();
  const defaultProductId = selectedProductId ?? 'lig-2847';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    market: '',
    product: defaultProductId,
    labelVersion: '',
    languages: [] as string[],
    dimensions: '',
    notes: '',
  });

  const steps = ['Artwork Info', 'Specifications', 'Review'];

  const handleCreate = () => {
    onCreate(formData);
    onClose();
    setStep(1);
    setFormData({ name: '', type: '', market: '', product: defaultProductId, labelVersion: '', languages: [], dimensions: '', notes: '' });
  };

  const isValid = step === 1 
    ? formData.name && formData.type && formData.market 
    : step === 2 
    ? formData.labelVersion 
    : true;

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="Create New Artwork" 
      icon={<Palette className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button 
            variant="primary" 
            onClick={step < 3 ? () => setStep(step + 1) : handleCreate}
            disabled={!isValid}
          >
            {step < 3 ? 'Continue' : 'Create Artwork'}
          </Button>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Artwork Name" required>
            <TextField 
              value={formData.name} 
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="e.g., Nexavant 50mg Carton - US"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Artwork Type" required>
              <SelectField 
                value={formData.type}
                onChange={(v) => setFormData({ ...formData, type: v })}
                options={artworkTypeOptions}
                placeholder="Select type..."
              />
            </FormField>
            <FormField label="Market" required>
              <SelectField 
                value={formData.market}
                onChange={(v) => setFormData({ ...formData, market: v })}
                options={countryOptions}
                placeholder="Select market..."
              />
            </FormField>
          </div>
          <FormField label="Product">
            <SelectField 
              value={formData.product}
              onChange={(v) => setFormData({ ...formData, product: v })}
              options={productOptions}
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormField label="Label Version" required hint="Link to an approved label version">
            <SelectField 
              value={formData.labelVersion}
              onChange={(v) => setFormData({ ...formData, labelVersion: v })}
              options={[
                { value: '2.0', label: 'v2.0 (Current)' },
                { value: '2.1', label: 'v2.1 (Pending Safety Update)' },
              ]}
              placeholder="Select version..."
            />
          </FormField>
          <FormField label="Dimensions">
            <TextField 
              value={formData.dimensions}
              onChange={(v) => setFormData({ ...formData, dimensions: v })}
              placeholder="e.g., 150mm x 100mm"
            />
          </FormField>
          <FormField label="Languages" hint="Select languages for this artwork">
            <div className="flex flex-wrap gap-2">
              {languageOptions.slice(0, 6).map(lang => (
                <button
                  key={lang.value}
                  onClick={() => setFormData({
                    ...formData,
                    languages: formData.languages.includes(lang.value)
                      ? formData.languages.filter(l => l !== lang.value)
                      : [...formData.languages, lang.value]
                  })}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    formData.languages.includes(lang.value)
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-card border border-border text-text-secondary hover:border-accent-blue/50'
                  }`}
                >
                  {lang.flag} {lang.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Notes">
            <TextAreaField 
              value={formData.notes}
              onChange={(v) => setFormData({ ...formData, notes: v })}
              placeholder="Any special instructions or requirements..."
            />
          </FormField>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-text-primary mb-3">Artwork Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div><span className="text-text-muted">Name:</span> <span className="text-text-primary">{formData.name}</span></div>
              <div><span className="text-text-muted">Type:</span> <span className="text-text-primary">{artworkTypeOptions.find(t => t.value === formData.type)?.label}</span></div>
              <div><span className="text-text-muted">Market:</span> <span className="text-text-primary">{countryOptions.find(c => c.value === formData.market)?.label}</span></div>
              <div><span className="text-text-muted">Label Version:</span> <span className="text-text-primary">v{formData.labelVersion}</span></div>
              {formData.dimensions && <div><span className="text-text-muted">Dimensions:</span> <span className="text-text-primary">{formData.dimensions}</span></div>}
            </div>
            {formData.languages.length > 0 && (
              <div className="mt-3">
                <span className="text-text-muted text-sm">Languages: </span>
                {formData.languages.map(l => (
                  <Badge key={l} color="blue" size="xs" className="mr-1">
                    {languageOptions.find(lang => lang.value === l)?.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
            <p className="text-sm text-text-secondary">Artwork will be created in Draft status. It must go through review and approval before reaching Print Ready status.</p>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

interface NewSKUModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewSKUInput) => void;
}

export function NewSKUModal({ isOpen, onClose, onCreate }: NewSKUModalProps) {
  const products = useProducts();
  const productOptions = products.map(p => ({ value: p.id, label: `${p.name}${p.brandName ? ' (' + p.brandName + ')' : ''}` }));
  const { selectedProductId } = useProductFilter();
  const defaultProductId = selectedProductId ?? 'lig-2847';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    market: '',
    product: defaultProductId,
    strength: '',
    packType: '',
    description: '',
    ndc: '',
    gtin: '',
    labelVersion: '',
  });

  const steps = ['SKU Info', 'Identifiers', 'Review'];

  const handleCreate = () => {
    onCreate(formData);
    onClose();
    setStep(1);
    setFormData({ market: '', product: defaultProductId, strength: '', packType: '', description: '', ndc: '', gtin: '', labelVersion: '' });
  };

  const isValid = step === 1 
    ? formData.market && formData.strength && formData.packType 
    : step === 2 
    ? formData.ndc || formData.gtin 
    : true;

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="Create New SKU" 
      icon={<Package className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button 
            variant="primary" 
            onClick={step < 3 ? () => setStep(step + 1) : handleCreate}
            disabled={!isValid}
          >
            {step < 3 ? 'Continue' : 'Create SKU'}
          </Button>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Market" required>
              <SelectField 
                value={formData.market}
                onChange={(v) => setFormData({ ...formData, market: v })}
                options={countryOptions}
                placeholder="Select market..."
              />
            </FormField>
            <FormField label="Product">
              <SelectField 
                value={formData.product}
                onChange={(v) => setFormData({ ...formData, product: v })}
                options={productOptions}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Strength" required>
              <SelectField 
                value={formData.strength}
                onChange={(v) => setFormData({ ...formData, strength: v })}
                options={[
                  { value: '25mg', label: '25 mg' },
                  { value: '50mg', label: '50 mg' },
                  { value: '100mg', label: '100 mg' },
                  { value: '200mg', label: '200 mg' },
                ]}
                placeholder="Select strength..."
              />
            </FormField>
            <FormField label="Pack Type" required>
              <SelectField 
                value={formData.packType}
                onChange={(v) => setFormData({ ...formData, packType: v })}
                options={skuPackTypeOptions}
                placeholder="Select pack type..."
              />
            </FormField>
          </div>
          <FormField label="Description">
            <TextField 
              value={formData.description}
              onChange={(v) => setFormData({ ...formData, description: v })}
              placeholder="e.g., Nexavant 50mg film-coated tablets"
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormField label="NDC (US)" hint="National Drug Code for US market">
            <TextField 
              value={formData.ndc}
              onChange={(v) => setFormData({ ...formData, ndc: v })}
              placeholder="e.g., 12345-678-90"
            />
          </FormField>
          <FormField label="GTIN" hint="Global Trade Item Number">
            <TextField 
              value={formData.gtin}
              onChange={(v) => setFormData({ ...formData, gtin: v })}
              placeholder="e.g., 00012345678905"
            />
          </FormField>
          <FormField label="Label Version" hint="Link to approved label version">
            <SelectField 
              value={formData.labelVersion}
              onChange={(v) => setFormData({ ...formData, labelVersion: v })}
              options={[
                { value: '2.0', label: 'v2.0 (Current)' },
                { value: '2.1', label: 'v2.1 (Pending)' },
              ]}
              placeholder="Select version..."
            />
          </FormField>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-surface-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-text-primary mb-3">SKU Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div><span className="text-text-muted">Market:</span> <span className="text-text-primary">{countryOptions.find(c => c.value === formData.market)?.label}</span></div>
              <div><span className="text-text-muted">Strength:</span> <span className="text-text-primary">{formData.strength}</span></div>
              <div><span className="text-text-muted">Pack Type:</span> <span className="text-text-primary">{skuPackTypeOptions.find(p => p.value === formData.packType)?.label}</span></div>
              {formData.ndc && <div><span className="text-text-muted">NDC:</span> <span className="text-text-primary font-mono">{formData.ndc}</span></div>}
              {formData.gtin && <div><span className="text-text-muted">GTIN:</span> <span className="text-text-primary font-mono">{formData.gtin}</span></div>}
              {formData.labelVersion && <div><span className="text-text-muted">Label:</span> <span className="text-text-primary">v{formData.labelVersion}</span></div>}
            </div>
            {formData.description && (
              <p className="text-sm text-text-secondary mt-3">{formData.description}</p>
            )}
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

// ============================================================================
// RESEARCH MODALS
// ============================================================================

interface NewTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewTargetInput) => void;
}

export function NewTargetModal({ isOpen, onClose, onCreate }: NewTargetModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    target: '',
    targetClass: '',
    indication: '',
    modality: '',
    stage: 'discovery',
    rationale: '',
    team: '',
    nextMilestone: '',
    nextMilestoneDate: '',
  });

  const steps = ['Target Info', 'Program Details', 'Milestones'];

  const handleCreate = () => {
    onCreate(formData);
    onClose();
    setStep(1);
    setFormData({ target: '', targetClass: '', indication: '', modality: '', stage: 'discovery', rationale: '', team: '', nextMilestone: '', nextMilestoneDate: '' });
  };

  const isValid = step === 1 
    ? formData.target && formData.targetClass && formData.indication 
    : step === 2 
    ? formData.modality && formData.team 
    : true;

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="Add New Target" 
      icon={<Target className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button 
            variant="primary" 
            onClick={step < 3 ? () => setStep(step + 1) : handleCreate}
            disabled={!isValid}
          >
            {step < 3 ? 'Continue' : 'Create Target'}
          </Button>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <FormField label="Target Name" required>
            <TextField 
              value={formData.target} 
              onChange={(v) => setFormData({ ...formData, target: v })}
              placeholder="e.g., CDK4/6, EGFR, PD-L1"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Target Class" required>
              <SelectField 
                value={formData.targetClass}
                onChange={(v) => setFormData({ ...formData, targetClass: v })}
                options={targetClassOptions}
                placeholder="Select class..."
              />
            </FormField>
            <FormField label="Stage">
              <SelectField 
                value={formData.stage}
                onChange={(v) => setFormData({ ...formData, stage: v })}
                options={stageOptions}
              />
            </FormField>
          </div>
          <FormField label="Primary Indication" required>
            <TextField 
              value={formData.indication}
              onChange={(v) => setFormData({ ...formData, indication: v })}
              placeholder="e.g., Non-Small Cell Lung Cancer"
            />
          </FormField>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormField label="Modality" required>
            <SelectField 
              value={formData.modality}
              onChange={(v) => setFormData({ ...formData, modality: v })}
              options={modalityOptions}
              placeholder="Select modality..."
            />
          </FormField>
          <FormField label="Lead Team" required>
            <TextField 
              value={formData.team}
              onChange={(v) => setFormData({ ...formData, team: v })}
              placeholder="e.g., Oncology Discovery"
            />
          </FormField>
          <FormField label="Scientific Rationale" hint="Brief description of the therapeutic hypothesis">
            <TextAreaField 
              value={formData.rationale}
              onChange={(v) => setFormData({ ...formData, rationale: v })}
              placeholder="Describe the scientific rationale for targeting this protein..."
              rows={4}
            />
          </FormField>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <FormField label="Next Milestone">
            <TextField 
              value={formData.nextMilestone}
              onChange={(v) => setFormData({ ...formData, nextMilestone: v })}
              placeholder="e.g., Lead compound selection"
            />
          </FormField>
          <FormField label="Target Date">
            <TextField 
              type="date"
              value={formData.nextMilestoneDate}
              onChange={(v) => setFormData({ ...formData, nextMilestoneDate: v })}
            />
          </FormField>
          <div className="bg-surface-card border border-border rounded-lg p-4 mt-4">
            <h3 className="font-medium text-text-primary mb-3">Target Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div><span className="text-text-muted">Target:</span> <span className="text-text-primary">{formData.target}</span></div>
              <div><span className="text-text-muted">Class:</span> <span className="text-text-primary">{targetClassOptions.find(t => t.value === formData.targetClass)?.label}</span></div>
              <div><span className="text-text-muted">Indication:</span> <span className="text-text-primary">{formData.indication}</span></div>
              <div><span className="text-text-muted">Modality:</span> <span className="text-text-primary">{modalityOptions.find(m => m.value === formData.modality)?.label}</span></div>
              <div><span className="text-text-muted">Stage:</span> <Badge color={formData.stage === 'discovery' ? 'slate' : formData.stage === 'clinical' ? 'green' : 'blue'} size="xs">{formData.stage}</Badge></div>
              <div><span className="text-text-muted">Team:</span> <span className="text-text-primary">{formData.team}</span></div>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}

interface NewPreclinicalStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewPreclinicalStudyInput) => void;
}

export function NewPreclinicalStudyModal({ isOpen, onClose, onCreate }: NewPreclinicalStudyModalProps) {
  const products = useProducts();
  const productOptions = products.map(p => ({ value: p.id, label: `${p.name}${p.brandName ? ' (' + p.brandName + ')' : ''}` }));
  const { selectedProductId } = useProductFilter();
  const defaultProductId = selectedProductId ?? 'lig-2847';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    studyNumber: '',
    title: '',
    studyType: '',
    species: '',
    product: defaultProductId,
    cro: '',
    glpCompliant: true,
    startDate: '',
    endDate: '',
    objectives: '',
  });

  const steps = ['Study Info', 'Execution', 'Schedule'];

  const handleCreate = () => {
    onCreate(formData);
    onClose();
    setStep(1);
    setFormData({ studyNumber: '', title: '', studyType: '', species: '', product: defaultProductId, cro: '', glpCompliant: true, startDate: '', endDate: '', objectives: '' });
  };

  const isValid = step === 1 
    ? formData.title && formData.studyType && formData.species 
    : step === 2 
    ? formData.cro 
    : formData.startDate;

  if (!isOpen) return null;

  return (
    <ModalWrapper 
      title="New Preclinical Study" 
      icon={<FlaskConical className="w-5 h-5 text-accent-blue" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button 
            variant="primary" 
            onClick={step < 3 ? () => setStep(step + 1) : handleCreate}
            disabled={!isValid}
          >
            {step < 3 ? 'Continue' : 'Create Study'}
          </Button>
        </>
      }
    >
      <StepIndicator steps={steps} currentStep={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Study Number">
              <TextField 
                value={formData.studyNumber}
                onChange={(v) => setFormData({ ...formData, studyNumber: v })}
                placeholder="e.g., TOX-2025-001"
              />
            </FormField>
            <FormField label="Product">
              <SelectField 
                value={formData.product}
                onChange={(v) => setFormData({ ...formData, product: v })}
                options={productOptions}
              />
            </FormField>
          </div>
          <FormField label="Study Title" required>
            <TextField 
              value={formData.title}
              onChange={(v) => setFormData({ ...formData, title: v })}
              placeholder="e.g., 28-Day Repeat Dose Toxicity Study in Rats"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Study Type" required>
              <SelectField 
                value={formData.studyType}
                onChange={(v) => setFormData({ ...formData, studyType: v })}
                options={studyTypeOptions}
                placeholder="Select type..."
              />
            </FormField>
            <FormField label="Species" required>
              <SelectField 
                value={formData.species}
                onChange={(v) => setFormData({ ...formData, species: v })}
                options={speciesOptions}
                placeholder="Select species..."
              />
            </FormField>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormField label="CRO (Contract Research Organization)" required>
            <SelectField 
              value={formData.cro}
              onChange={(v) => setFormData({ ...formData, cro: v })}
              options={[
                { value: 'charles-river', label: 'Charles River Laboratories' },
                { value: 'covance', label: 'Covance (Labcorp)' },
                { value: 'wuxi', label: 'WuXi AppTec' },
                { value: 'eurofins', label: 'Eurofins' },
                { value: 'inotiv', label: 'Inotiv' },
                { value: 'in-house', label: 'In-House' },
              ]}
              placeholder="Select CRO..."
            />
          </FormField>
          <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg border border-border">
            <div>
              <div className="text-sm text-text-primary">GLP Compliant</div>
              <div className="text-xs text-text-muted">Conducted under Good Laboratory Practice</div>
            </div>
            <button 
              onClick={() => setFormData({ ...formData, glpCompliant: !formData.glpCompliant })}
              className={`w-12 h-6 rounded-full transition-colors ${formData.glpCompliant ? 'bg-accent-green' : 'bg-surface'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${formData.glpCompliant ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <FormField label="Objectives">
            <TextAreaField 
              value={formData.objectives}
              onChange={(v) => setFormData({ ...formData, objectives: v })}
              placeholder="Primary and secondary objectives of the study..."
              rows={4}
            />
          </FormField>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField label="Start Date" required>
              <TextField 
                type="date"
                value={formData.startDate}
                onChange={(v) => setFormData({ ...formData, startDate: v })}
              />
            </FormField>
            <FormField label="Expected End Date">
              <TextField 
                type="date"
                value={formData.endDate}
                onChange={(v) => setFormData({ ...formData, endDate: v })}
              />
            </FormField>
          </div>
          <div className="bg-surface-card border border-border rounded-lg p-4 mt-4">
            <h3 className="font-medium text-text-primary mb-3">Study Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div><span className="text-text-muted">Number:</span> <span className="text-text-primary font-mono">{formData.studyNumber || 'Auto-generated'}</span></div>
              <div><span className="text-text-muted">Type:</span> <span className="text-text-primary">{studyTypeOptions.find(t => t.value === formData.studyType)?.label}</span></div>
              <div><span className="text-text-muted">Species:</span> <span className="text-text-primary">{speciesOptions.find(s => s.value === formData.species)?.label}</span></div>
              <div><span className="text-text-muted">CRO:</span> <span className="text-text-primary">{formData.cro}</span></div>
              <div><span className="text-text-muted">GLP:</span> <Badge color={formData.glpCompliant ? 'green' : 'amber'} size="xs">{formData.glpCompliant ? 'Yes' : 'No'}</Badge></div>
              <div><span className="text-text-muted">Start:</span> <span className="text-text-primary">{formData.startDate}</span></div>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}
