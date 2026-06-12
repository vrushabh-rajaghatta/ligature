

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { ModuleId } from '@/types/core'

// User roles aligned to pharma org structure
export type UserRole = 
  | 'regulatory-affairs'    // RA managers, submission leads
  | 'clinical-operations'   // Clinical ops, CRAs, study managers
  | 'cmc-lead'              // CMC, manufacturing, quality
  | 'safety-pv'             // Pharmacovigilance, drug safety
  | 'medical-affairs'       // MSLs, medical directors
  | 'executive'             // C-suite, portfolio leads
  | 'custom';               // User-defined

export interface UserRoleConfig {
  role: UserRole;
  label: string;
  description: string;
  primaryModules: ModuleId[];      // First row of dashboard (prominent)
  secondaryModules: ModuleId[];    // Second row (accessible)
  hiddenModules: ModuleId[];       // Hidden from nav (can still access via URL)
  defaultLandingModule: ModuleId;
  quickActions: string[];          // Command palette favorites
}

// Preset configurations for each role
export const ROLE_PRESETS: Record<UserRole, UserRoleConfig> = {
  'regulatory-affairs': {
    role: 'regulatory-affairs',
    label: 'Regulatory Affairs',
    description: 'Submission management, HAQ responses, publishing, labeling',
    primaryModules: ['submissions-hub', 'haq', 'publishing', 'authoring'],
    secondaryModules: ['labeling', 'strategy', 'master-data', 'reg-calendar'],
    hiddenModules: ['research', 'ctms', 'supply-chain', 'commercial'],
    defaultLandingModule: 'submissions-hub',
    quickActions: ['new-submission', 'new-haq-response', 'filter-overdue'],
  },
  'clinical-operations': {
    role: 'clinical-operations',
    label: 'Clinical Operations',
    description: 'Trial management, TMF, study data, site operations',
    primaryModules: ['ctms', 'tmf', 'safety', 'study-intel'],
    secondaryModules: ['study-design', 'development', 'qms'],
    hiddenModules: ['cmc-manufacturing', 'supply-chain', 'commercial', 'labeling'],
    defaultLandingModule: 'ctms',
    quickActions: ['new-deviation', 'filter-my-items', 'jump-to-product'],
  },
  'cmc-lead': {
    role: 'cmc-lead',
    label: 'CMC & Manufacturing',
    description: 'Drug substance, drug product, manufacturing ops, quality',
    primaryModules: ['cmc-manufacturing', 'quality', 'qms', 'supply-chain'],
    secondaryModules: ['authoring', 'submissions-hub', 'master-data'],
    hiddenModules: ['ctms', 'tmf', 'study-intel', 'medical-affairs'],
    defaultLandingModule: 'cmc-manufacturing',
    quickActions: ['new-deviation', 'new-capa', 'filter-overdue'],
  },
  'safety-pv': {
    role: 'safety-pv',
    label: 'Safety & Pharmacovigilance',
    description: 'Signal detection, case management, aggregate reports, labeling safety',
    primaryModules: ['safety', 'labeling', 'submissions-hub', 'haq'],
    secondaryModules: ['ctms', 'authoring', 'master-data'],
    hiddenModules: ['cmc-manufacturing', 'supply-chain', 'commercial', 'research'],
    defaultLandingModule: 'safety',
    quickActions: ['filter-overdue', 'new-haq-response', 'view-signals'],
  },
  'medical-affairs': {
    role: 'medical-affairs',
    label: 'Medical Affairs',
    description: 'MSL activities, publications, scientific communications',
    primaryModules: ['medical-affairs', 'publications', 'labeling', 'safety'],
    secondaryModules: ['ctms', 'study-intel', 'commercial'],
    hiddenModules: ['cmc-manufacturing', 'qms', 'supply-chain', 'publishing'],
    defaultLandingModule: 'medical-affairs',
    quickActions: ['new-document', 'recent-documents'],
  },
  'executive': {
    role: 'executive',
    label: 'Executive / Portfolio',
    description: 'Cross-functional visibility, portfolio metrics, strategic overview',
    primaryModules: ['portfolio', 'activity', 'submissions-hub', 'safety'],
    secondaryModules: ['ctms', 'cmc-manufacturing', 'haq', 'analytics'],
    hiddenModules: [], // Executives see everything
    defaultLandingModule: 'portfolio',
    quickActions: ['filter-overdue', 'quick-search', 'view-alerts'],
  },
  'custom': {
    role: 'custom',
    label: 'Custom',
    description: 'Personalized module selection',
    primaryModules: ['portfolio'],
    secondaryModules: [],
    hiddenModules: [],
    defaultLandingModule: 'portfolio',
    quickActions: [],
  },
};

// Role selection card info for onboarding
export interface RoleCardInfo {
  role: UserRole;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
}

export const ROLE_CARDS: RoleCardInfo[] = [
  {
    role: 'regulatory-affairs',
    label: 'Regulatory Affairs',
    description: 'Submissions, HAQs, publishing, labeling',
    icon: 'FileText',
    color: 'blue',
  },
  {
    role: 'clinical-operations',
    label: 'Clinical Operations',
    description: 'Trials, TMF, study management',
    icon: 'Activity',
    color: 'green',
  },
  {
    role: 'cmc-lead',
    label: 'CMC & Manufacturing',
    description: 'Drug substance, manufacturing, quality',
    icon: 'Factory',
    color: 'orange',
  },
  {
    role: 'safety-pv',
    label: 'Safety & PV',
    description: 'Signal detection, case management',
    icon: 'ShieldAlert',
    color: 'red',
  },
  {
    role: 'medical-affairs',
    label: 'Medical Affairs',
    description: 'MSL activities, publications',
    icon: 'Stethoscope',
    color: 'purple',
  },
  {
    role: 'executive',
    label: 'Executive',
    description: 'Portfolio overview, all modules',
    icon: 'LayoutDashboard',
    color: 'slate',
  },
];

interface UserRoleState {
  // Current role and config
  currentRole: UserRole | null;
  roleConfig: UserRoleConfig | null;
  hasCompletedOnboarding: boolean;
  
  // Custom role overrides (for 'custom' role or user tweaks)
  customPrimaryModules: ModuleId[];
  customSecondaryModules: ModuleId[];
  customHiddenModules: ModuleId[];
  
  // Actions
  setRole: (role: UserRole) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  
  // Custom role management
  setCustomPrimaryModules: (modules: ModuleId[]) => void;
  setCustomSecondaryModules: (modules: ModuleId[]) => void;
  setCustomHiddenModules: (modules: ModuleId[]) => void;
  toggleModuleVisibility: (moduleId: ModuleId) => void;
  
  // Computed helpers
  isModuleHidden: (moduleId: ModuleId) => boolean;
  isModulePrimary: (moduleId: ModuleId) => boolean;
  isModuleSecondary: (moduleId: ModuleId) => boolean;
  getEffectiveConfig: () => UserRoleConfig;
}

export const useUserRoleStore = create<UserRoleState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentRole: null,
        roleConfig: null,
        hasCompletedOnboarding: false,
        customPrimaryModules: [],
        customSecondaryModules: [],
        customHiddenModules: [],
        
        // Set role and update config
        setRole: (role) => {
          const config = ROLE_PRESETS[role];
          set(
            {
              currentRole: role,
              roleConfig: config,
            },
            false,
            'setRole'
          );
        },
        
        completeOnboarding: () =>
          set({ hasCompletedOnboarding: true }, false, 'completeOnboarding'),
        
        resetOnboarding: () =>
          set(
            {
              currentRole: null,
              roleConfig: null,
              hasCompletedOnboarding: false,
              customPrimaryModules: [],
              customSecondaryModules: [],
              customHiddenModules: [],
            },
            false,
            'resetOnboarding'
          ),
        
        // Custom module management
        setCustomPrimaryModules: (modules) =>
          set({ customPrimaryModules: modules }, false, 'setCustomPrimaryModules'),
        
        setCustomSecondaryModules: (modules) =>
          set({ customSecondaryModules: modules }, false, 'setCustomSecondaryModules'),
        
        setCustomHiddenModules: (modules) =>
          set({ customHiddenModules: modules }, false, 'setCustomHiddenModules'),
        
        toggleModuleVisibility: (moduleId) => {
          const { customHiddenModules } = get();
          const isHidden = customHiddenModules.includes(moduleId);
          set(
            {
              customHiddenModules: isHidden
                ? customHiddenModules.filter((m) => m !== moduleId)
                : [...customHiddenModules, moduleId],
            },
            false,
            'toggleModuleVisibility'
          );
        },
        
        // Computed helpers
        isModuleHidden: (moduleId) => {
          const { roleConfig, customHiddenModules } = get();
          // Custom overrides take precedence
          if (customHiddenModules.includes(moduleId)) return true;
          // Then check role config
          return roleConfig?.hiddenModules.includes(moduleId) ?? false;
        },
        
        isModulePrimary: (moduleId) => {
          const { roleConfig, customPrimaryModules } = get();
          if (customPrimaryModules.length > 0) {
            return customPrimaryModules.includes(moduleId);
          }
          return roleConfig?.primaryModules.includes(moduleId) ?? false;
        },
        
        isModuleSecondary: (moduleId) => {
          const { roleConfig, customSecondaryModules } = get();
          if (customSecondaryModules.length > 0) {
            return customSecondaryModules.includes(moduleId);
          }
          return roleConfig?.secondaryModules.includes(moduleId) ?? false;
        },
        
        getEffectiveConfig: () => {
          const { roleConfig, customPrimaryModules, customSecondaryModules, customHiddenModules } = get();
          
          if (!roleConfig) {
            return ROLE_PRESETS['executive']; // Default fallback
          }
          
          return {
            ...roleConfig,
            primaryModules: customPrimaryModules.length > 0 ? customPrimaryModules : roleConfig.primaryModules,
            secondaryModules: customSecondaryModules.length > 0 ? customSecondaryModules : roleConfig.secondaryModules,
            hiddenModules: [...roleConfig.hiddenModules, ...customHiddenModules],
          };
        },
      }),
      {
        name: 'ligature-user-role-storage',
        partialize: (state) => ({
          currentRole: state.currentRole,
          hasCompletedOnboarding: state.hasCompletedOnboarding,
          customPrimaryModules: state.customPrimaryModules,
          customSecondaryModules: state.customSecondaryModules,
          customHiddenModules: state.customHiddenModules,
        }),
      }
    ),
    { name: 'LigatureUserRole' }
  )
);

// Selector hooks
export const useCurrentRole = () => useUserRoleStore((state) => state.currentRole);
export const useRoleConfig = () => useUserRoleStore(useShallow((state) => state.roleConfig));
export const useHasCompletedOnboarding = () => useUserRoleStore((state) => state.hasCompletedOnboarding);
// Use shallow comparison because getEffectiveConfig() returns a new object each call
export const useEffectiveRoleConfig = () => useUserRoleStore(useShallow((state) => state.getEffectiveConfig()));
