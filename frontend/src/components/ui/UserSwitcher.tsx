

/**
 * UserSwitcher - v133
 * 
 * Components for switching between demo personas and roles:
 * - UserSwitcher: Full panel with persona list and role selector
 * - UserSwitcherWidget: Compact dropdown for header placement
 * - UserSwitcherBadge: Inline badge showing current user/role
 * - PermissionGate: HOC for permission-based rendering
 */

import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  Users,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Edit3,
  CheckCircle,
  Crown,
  Lock,
  Unlock,
  RefreshCw,
  Settings,
  Search,
  X,
} from 'lucide-react';
import {
  useSessionStore,
  useCurrentUser,
  useCurrentRole,
  useActivePersona,
  DEMO_PERSONAS,
  DemoPersona,
  PlatformRole,
  ModulePermission,
  ModulePermissions,
  getRoleLabel,
  getRoleColor,
  getPermissionLabel,
} from '@/store/useSessionStore';
import { users, User as UserType } from '@/data/users-data';
import { Badge, BadgeColor } from './Badge';
import { Button } from './Button';
import { Card, CardHeader, CardContent } from './Card';

// ============================================================================
// ROLE ICONS
// ============================================================================

const ROLE_ICONS: Record<PlatformRole, React.ReactNode> = {
  viewer: <Eye className="w-4 h-4" />,
  author: <Edit3 className="w-4 h-4" />,
  reviewer: <Shield className="w-4 h-4" />,
  approver: <ShieldCheck className="w-4 h-4" />,
  publisher: <CheckCircle className="w-4 h-4" />,
  admin: <Crown className="w-4 h-4" />,
};

// ============================================================================
// USER SWITCHER WIDGET (Compact dropdown for header)
// ============================================================================

interface UserSwitcherWidgetProps {
  className?: string;
}

export function UserSwitcherWidget({ className = '' }: UserSwitcherWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentUser = useCurrentUser();
  const currentRole = useCurrentRole();
  const activePersona = useActivePersona();
  const switchToPersona = useSessionStore((s) => s.switchToPersona);
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Filter personas by search
  const filteredPersonas = DEMO_PERSONAS.filter(p => {
    if (!searchQuery) return true;
    const user = users.find(u => u.id === p.userId);
    const query = searchQuery.toLowerCase();
    return (
      p.label.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      user?.name.toLowerCase().includes(query) ||
      user?.department.toLowerCase().includes(query)
    );
  });
  
  const handleSelect = (personaId: string) => {
    switchToPersona(personaId);
    setIsOpen(false);
    setSearchQuery('');
  };
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-card transition-colors"
      >
        <div className="w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {currentUser?.initials || 'U'}
          </span>
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-text-primary leading-tight">
            {currentUser?.name || 'Unknown User'}
          </div>
          <div className="text-xs text-text-muted leading-tight flex items-center gap-1">
            {ROLE_ICONS[currentRole]}
            <span>{getRoleLabel(currentRole)}</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-surface-elevated border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Current User Header */}
          <div className="px-4 py-3 bg-surface-card border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-blue rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium">
                  {currentUser?.initials || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-text-primary truncate">
                  {currentUser?.name || 'Unknown User'}
                </div>
                <div className="text-xs text-text-muted truncate">
                  {currentUser?.role || activePersona?.label}
                </div>
              </div>
              <Badge color={getRoleColor(currentRole) as BadgeColor} size="sm">
                {getRoleLabel(currentRole)}
              </Badge>
            </div>
          </div>
          
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-elevated rounded"
                >
                  <X className="w-3 h-3 text-text-muted" />
                </button>
              )}
            </div>
          </div>
          
          {/* Persona List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredPersonas.length === 0 ? (
              <div className="px-4 py-6 text-center text-text-muted text-sm">
                No personas found
              </div>
            ) : (
              filteredPersonas.map((persona) => {
                const user = users.find(u => u.id === persona.userId);
                const isActive = activePersona?.id === persona.id;
                
                return (
                  <button
                    key={persona.id}
                    onClick={() => handleSelect(persona.id)}
                    className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                      isActive
                        ? 'bg-accent-blue/10 border-l-2 border-accent-blue'
                        : 'hover:bg-surface-card border-l-2 border-transparent'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-accent-blue' : 'bg-surface-card'
                    }`}>
                      <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                        {user?.initials || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {persona.label}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {user?.name} · {user?.department}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-text-muted">
                      {ROLE_ICONS[persona.role]}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-surface-card">
            <div className="text-xs text-text-muted text-center">
              Switch personas for demo • {DEMO_PERSONAS.length} available
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// USER SWITCHER PANEL (Full panel for Admin screen)
// ============================================================================

interface UserSwitcherPanelProps {
  className?: string;
  showPermissions?: boolean;
}

export function UserSwitcherPanel({ className = '', showPermissions = true }: UserSwitcherPanelProps) {
  const currentUser = useCurrentUser();
  const currentRole = useCurrentRole();
  const permissions = useSessionStore((s) => s.permissions);
  const activePersona = useActivePersona();
  const switchToPersona = useSessionStore((s) => s.switchToPersona);
  const setRole = useSessionStore((s) => s.setRole);
  const resetSession = useSessionStore((s) => s.resetSession);
  
  const [selectedTab, setSelectedTab] = useState<'personas' | 'permissions'>('personas');
  
  const ROLES: PlatformRole[] = ['viewer', 'author', 'reviewer', 'approver', 'publisher', 'admin'];
  const MODULES: (keyof ModulePermissions)[] = ['portfolio', 'authoring', 'submissions', 'safety', 'clinical', 'quality', 'admin'];
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">User Session</h3>
              <p className="text-xs text-text-muted">Switch personas and manage permissions</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSession}
            className="text-text-muted hover:text-text-primary"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current User Display */}
        <div className="p-3 bg-surface-card rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent-blue rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-medium">
                {currentUser?.initials || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-text-primary">
                {currentUser?.name || 'Unknown User'}
              </div>
              <div className="text-sm text-text-secondary">
                {currentUser?.role || 'No role assigned'}
              </div>
              <div className="text-xs text-text-muted">
                {currentUser?.department} · {currentUser?.email}
              </div>
            </div>
            <Badge color={getRoleColor(currentRole) as BadgeColor}>
              {getRoleLabel(currentRole)}
            </Badge>
          </div>
        </div>
        
        {/* Tabs */}
        {showPermissions && (
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setSelectedTab('personas')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'personas'
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Demo Personas
            </button>
            <button
              onClick={() => setSelectedTab('permissions')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === 'permissions'
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Permissions
            </button>
          </div>
        )}
        
        {/* Personas Grid */}
        {selectedTab === 'personas' && (
          <div className="grid grid-cols-2 gap-2">
            {DEMO_PERSONAS.map((persona) => {
              const user = users.find(u => u.id === persona.userId);
              const isActive = activePersona?.id === persona.id;
              
              return (
                <button
                  key={persona.id}
                  onClick={() => switchToPersona(persona.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isActive
                      ? 'bg-accent-blue/10 border-accent-blue ring-1 ring-accent-blue'
                      : 'bg-surface-card border-border hover:border-accent-blue/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-accent-blue' : 'bg-surface-elevated'
                    }`}>
                      <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                        {user?.initials || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {persona.label}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {user?.name}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-text-muted">
                    {ROLE_ICONS[persona.role]}
                    <span>{getRoleLabel(persona.role)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Permissions Tab */}
        {selectedTab === 'permissions' && (
          <div className="space-y-4">
            {/* Role Selector */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Platform Role
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => setRole(role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      currentRole === role
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
                    }`}
                  >
                    {ROLE_ICONS[role]}
                    <span>{getRoleLabel(role)}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Module Permissions Grid */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Module Permissions
              </label>
              <div className="space-y-1">
                {MODULES.map((module) => {
                  const level = permissions[module];
                  return (
                    <div
                      key={module}
                      className="flex items-center justify-between py-2 px-3 bg-surface-card rounded-lg"
                    >
                      <span className="text-sm font-medium text-text-primary capitalize">
                        {module}
                      </span>
                      <div className="flex items-center gap-2">
                        {level === 'none' ? (
                          <Lock className="w-4 h-4 text-red-500" />
                        ) : level === 'admin' ? (
                          <Crown className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-500" />
                        )}
                        <Badge
                          color={
                            level === 'none' ? 'red' :
                            level === 'view' ? 'slate' :
                            level === 'edit' ? 'blue' :
                            level === 'approve' ? 'green' : 'amber'
                          }
                          size="sm"
                        >
                          {getPermissionLabel(level)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// USER SWITCHER BADGE (Inline compact display)
// ============================================================================

interface UserSwitcherBadgeProps {
  showRole?: boolean;
  className?: string;
}

export function UserSwitcherBadge({ showRole = true, className = '' }: UserSwitcherBadgeProps) {
  const currentUser = useCurrentUser();
  const currentRole = useCurrentRole();
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-6 h-6 bg-accent-blue rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-medium">
          {currentUser?.initials || 'U'}
        </span>
      </div>
      <span className="text-sm font-medium text-text-primary">
        {currentUser?.name || 'Unknown'}
      </span>
      {showRole && (
        <Badge color={getRoleColor(currentRole) as BadgeColor} size="sm">
          {getRoleLabel(currentRole)}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// PERMISSION GATE (Conditional rendering based on permissions)
// ============================================================================

interface PermissionGateProps {
  /** Module to check permission for */
  module: keyof ModulePermissions;
  /** Minimum required permission level */
  required: ModulePermission;
  /** Content to render if permission is granted */
  children: ReactNode;
  /** Fallback content if permission is denied */
  fallback?: ReactNode;
  /** Show a "no access" message instead of nothing */
  showDenied?: boolean;
}

export function PermissionGate({
  module,
  required,
  children,
  fallback,
  showDenied = false,
}: PermissionGateProps) {
  const hasPermission = useSessionStore((s) => s.hasPermission(module, required));
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showDenied) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
        <Lock className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-700">
          You don't have permission to access this feature
        </span>
      </div>
    );
  }
  
  return null;
}

// ============================================================================
// ACTION GATE (Wrapper for action buttons)
// ============================================================================

interface ActionGateProps {
  /** Module to check permission for */
  module: keyof ModulePermissions;
  /** Minimum required permission level */
  required: ModulePermission;
  /** The action button/component */
  children: ReactNode;
  /** Show disabled state instead of hiding */
  showDisabled?: boolean;
  /** Tooltip message when disabled */
  disabledMessage?: string;
}

export function ActionGate({
  module,
  required,
  children,
  showDisabled = true,
  disabledMessage = 'Insufficient permissions',
}: ActionGateProps) {
  const hasPermission = useSessionStore((s) => s.hasPermission(module, required));
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  if (showDisabled) {
    return (
      <div className="relative group">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {disabledMessage}
        </div>
      </div>
    );
  }
  
  return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ROLE_ICONS,
};
