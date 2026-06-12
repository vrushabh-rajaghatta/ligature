

import { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  FileText, 
  Activity, 
  Factory, 
  ShieldAlert, 
  Stethoscope, 
  LayoutDashboard,
  Check,
  UserCog
} from 'lucide-react';
import { 
  useUserRoleStore, 
  useCurrentRole, 
  ROLE_PRESETS, 
  ROLE_CARDS,
  type UserRole 
} from '@/store/useUserRoleStore';

// Icon mapping
const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  'regulatory-affairs': <FileText className="w-4 h-4" />,
  'clinical-operations': <Activity className="w-4 h-4" />,
  'cmc-lead': <Factory className="w-4 h-4" />,
  'safety-pv': <ShieldAlert className="w-4 h-4" />,
  'medical-affairs': <Stethoscope className="w-4 h-4" />,
  'executive': <LayoutDashboard className="w-4 h-4" />,
  'custom': <UserCog className="w-4 h-4" />,
};

const ROLE_COLORS: Record<UserRole, string> = {
  'regulatory-affairs': '#3B82F6', // blue
  'clinical-operations': '#10B981', // green
  'cmc-lead': '#F59E0B', // orange
  'safety-pv': '#EF4444', // red
  'medical-affairs': '#8B5CF6', // purple
  'executive': '#64748B', // slate
  'custom': '#6B7280', // gray
};

interface RoleSelectorProps {
  compact?: boolean;
  onRoleChange?: (role: UserRole) => void;
}

export function RoleSelector({ compact = false, onRoleChange }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentRole = useCurrentRole();
  const setRole = useUserRoleStore((s) => s.setRole);
  const completeOnboarding = useUserRoleStore((s) => s.completeOnboarding);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRole = (role: UserRole) => {
    setRole(role);
    completeOnboarding();
    setIsOpen(false);
    onRoleChange?.(role);
  };

  const currentConfig = currentRole ? ROLE_PRESETS[currentRole] : null;
  const currentColor = currentRole ? ROLE_COLORS[currentRole] : '#6B7280';

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          isOpen 
            ? 'border-accent-blue bg-accent-blue/10' 
            : 'border-border hover:border-border-focus bg-surface-card hover:bg-surface-elevated'
        }`}
        title="Switch role view"
      >
        {currentRole ? (
          <>
            <span style={{ color: currentColor }}>{ROLE_ICONS[currentRole]}</span>
            {!compact && (
              <span className="text-sm font-medium text-text-primary">
                {currentConfig?.label || 'Select Role'}
              </span>
            )}
          </>
        ) : (
          <>
            <UserCog className="w-4 h-4 text-text-muted" />
            {!compact && (
              <span className="text-sm text-text-muted">Select Role</span>
            )}
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-surface-elevated border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-down">
          <div className="px-4 py-3 border-b border-border/50 bg-surface-card/50">
            <div className="text-xs uppercase tracking-wider text-text-muted font-medium">
              Dashboard View
            </div>
            <div className="text-xs text-text-muted mt-1">
              Customize your Ligature experience
            </div>
          </div>
          
          <div className="p-2 max-h-80 overflow-y-auto">
            {ROLE_CARDS.map((card) => {
              const isSelected = currentRole === card.role;
              const color = ROLE_COLORS[card.role];
              
              return (
                <button
                  key={card.role}
                  onClick={() => handleSelectRole(card.role)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    isSelected 
                      ? 'bg-accent-blue/10 border border-accent-blue/30' 
                      : 'hover:bg-surface-card border border-transparent'
                  }`}
                >
                  <div 
                    className="p-2 rounded-lg mt-0.5"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <span style={{ color }}>{ROLE_ICONS[card.role]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${isSelected ? 'text-accent-blue' : 'text-text-primary'}`}>
                        {card.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-accent-blue" />}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {card.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="px-4 py-2 border-t border-border/50 bg-surface-card/30">
            <div className="text-[10px] text-text-muted text-center">
              Role affects dashboard layout & navigation
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact variant for mobile/space-constrained areas
export function RoleSelectorCompact({ onRoleChange }: { onRoleChange?: (role: UserRole) => void }) {
  return <RoleSelector compact onRoleChange={onRoleChange} />;
}
