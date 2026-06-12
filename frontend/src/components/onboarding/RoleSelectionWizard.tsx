

import { useState } from 'react';
import { 
  FileText, Activity, Factory, ShieldAlert, Stethoscope, 
  LayoutDashboard, ChevronRight, Sparkles, Check
} from 'lucide-react';
import { 
  useUserRoleStore, 
  ROLE_PRESETS, 
  ROLE_CARDS,
  type UserRole,
  type UserRoleConfig
} from '@/store/useUserRoleStore';

// Icon mapping
const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  'regulatory-affairs': <FileText className="w-6 h-6" />,
  'clinical-operations': <Activity className="w-6 h-6" />,
  'cmc-lead': <Factory className="w-6 h-6" />,
  'safety-pv': <ShieldAlert className="w-6 h-6" />,
  'medical-affairs': <Stethoscope className="w-6 h-6" />,
  'executive': <LayoutDashboard className="w-6 h-6" />,
  'custom': <LayoutDashboard className="w-6 h-6" />,
};

const ROLE_COLORS: Record<UserRole, string> = {
  'regulatory-affairs': '#3B82F6',
  'clinical-operations': '#10B981',
  'cmc-lead': '#F59E0B',
  'safety-pv': '#EF4444',
  'medical-affairs': '#8B5CF6',
  'executive': '#64748B',
  'custom': '#6B7280',
};

// Module labels for preview
const MODULE_LABELS: Record<string, string> = {
  'submissions-hub': 'Submissions Hub',
  'haq': 'HAQ Intelligence',
  'publishing': 'Publishing',
  'authoring': 'Document Authoring',
  'labeling': 'Labeling',
  'strategy': 'Reg Strategy',
  'master-data': 'Master Data',
  'reg-calendar': 'Reg Calendar',
  'ctms': 'Clinical Trials',
  'tmf': 'Trial Master File',
  'safety': 'Safety & PV',
  'study-intel': 'Study Intelligence',
  'cmc-manufacturing': 'CMC & Manufacturing',
  'quality': 'Quality',
  'qms': 'Quality Management',
  'supply-chain': 'Supply Chain',
  'medical-affairs': 'Medical Affairs',
  'publications': 'Publications',
  'portfolio': 'Portfolio',
  'activity': 'Activity',
  'analytics': 'Analytics',
};

interface RoleSelectionWizardProps {
  onComplete: (role: UserRole) => void;
  onSkip?: () => void;
}

function RoleCard({ 
  role, 
  label, 
  description, 
  config,
  selected, 
  onSelect 
}: { 
  role: UserRole;
  label: string;
  description: string;
  config: UserRoleConfig;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = ROLE_COLORS[role];
  const icon = ROLE_ICONS[role];
  
  return (
    <button
      onClick={onSelect}
      className={`relative p-5 rounded-xl border-2 text-left transition-all ${
        selected 
          ? 'border-accent-blue bg-accent-blue/5 ring-2 ring-accent-blue/20' 
          : 'border-border hover:border-border-focus bg-surface-card hover:bg-surface-elevated'
      }`}
    >
      {/* Selected indicator */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-accent-blue flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      {/* Icon + Title */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="p-2.5 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <h3 className={`font-semibold ${selected ? 'text-accent-blue' : 'text-text-primary'}`}>
            {label}
          </h3>
          <p className="text-sm text-text-muted mt-0.5">{description}</p>
        </div>
      </div>
      
      {/* Module Preview */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="text-xs text-text-muted mb-2">Primary modules:</div>
        <div className="flex flex-wrap gap-1.5">
          {config.primaryModules.slice(0, 4).map(moduleId => (
            <span 
              key={moduleId}
              className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-text-secondary"
            >
              {MODULE_LABELS[moduleId] || moduleId}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export function RoleSelectionWizard({ onComplete, onSkip }: RoleSelectionWizardProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const setRole = useUserRoleStore((s) => s.setRole);
  const completeOnboarding = useUserRoleStore((s) => s.completeOnboarding);
  
  const handleContinue = () => {
    if (selectedRole) {
      setRole(selectedRole);
      completeOnboarding();
      onComplete(selectedRole);
    }
  };
  
  const handleSkip = () => {
    // Default to executive (sees everything)
    setRole('executive');
    completeOnboarding();
    onSkip?.();
    onComplete('executive');
  };
  
  // Filter out 'custom' from wizard - it's for advanced users
  const displayRoles = ROLE_CARDS.filter(card => card.role !== 'custom');
  
  return (
    <div className="fixed inset-0 z-50 bg-surface-base/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Personalize Your Experience</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-3">
            What's your role?
          </h1>
          <p className="text-text-muted max-w-xl mx-auto">
            Ligature adapts to how you work. Select your primary function and we'll 
            surface the modules, metrics, and actions most relevant to you.
          </p>
        </div>
        
        {/* Role Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {displayRoles.map(card => (
            <RoleCard
              key={card.role}
              role={card.role}
              label={card.label}
              description={card.description}
              config={ROLE_PRESETS[card.role]}
              selected={selectedRole === card.role}
              onSelect={() => setSelectedRole(card.role)}
            />
          ))}
        </div>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Skip for now
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              selectedRole
                ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                : 'bg-surface-card text-text-muted cursor-not-allowed'
            }`}
          >
            <span>Continue to Ligature</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Helper text */}
        <p className="text-center text-xs text-text-muted mt-6">
          You can change your role anytime from the header dropdown
        </p>
      </div>
    </div>
  );
}
