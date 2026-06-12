

// ============================================================================
// Session Store - v133: User Switching & Role-Based Permissions
// Manages current user context, role-based permissions, and session state
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { users, User } from '@/data/users-data';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Platform roles with hierarchical permissions
 * - viewer: Read-only access to all modules
 * - author: Can create and edit own content
 * - reviewer: Can review and comment on content
 * - approver: Can approve documents and submissions
 * - publisher: Can publish and submit to gateways
 * - admin: Full platform access including configuration
 */
export type PlatformRole = 
  | 'viewer'
  | 'author'
  | 'reviewer'
  | 'approver'
  | 'publisher'
  | 'admin';

/**
 * Module-specific permission levels
 */
export type ModulePermission = 'none' | 'view' | 'edit' | 'approve' | 'admin';

/**
 * Permission configuration for each module
 */
export interface ModulePermissions {
  portfolio: ModulePermission;
  authoring: ModulePermission;
  submissions: ModulePermission;
  safety: ModulePermission;
  clinical: ModulePermission;
  quality: ModulePermission;
  admin: ModulePermission;
}

/**
 * Demo persona with role and permissions
 */
export interface DemoPersona {
  id: string;
  userId: string;
  role: PlatformRole;
  label: string;
  description: string;
  permissions: ModulePermissions;
}

/**
 * Session state
 */
export interface SessionState {
  // Current user
  currentUserId: string;
  currentUser: User | null;
  
  // Role and permissions
  currentRole: PlatformRole;
  permissions: ModulePermissions;
  
  // Session metadata
  sessionStarted: string;
  lastActivity: string;
  
  // Demo personas
  activePersonaId: string | null;
}

// ============================================================================
// ROLE PERMISSION MAPPINGS
// ============================================================================

/**
 * Default permissions for each role
 */
const ROLE_PERMISSIONS: Record<PlatformRole, ModulePermissions> = {
  viewer: {
    portfolio: 'view',
    authoring: 'view',
    submissions: 'view',
    safety: 'view',
    clinical: 'view',
    quality: 'view',
    admin: 'none',
  },
  author: {
    portfolio: 'view',
    authoring: 'edit',
    submissions: 'view',
    safety: 'view',
    clinical: 'view',
    quality: 'view',
    admin: 'none',
  },
  reviewer: {
    portfolio: 'view',
    authoring: 'edit',
    submissions: 'view',
    safety: 'edit',
    clinical: 'view',
    quality: 'view',
    admin: 'none',
  },
  approver: {
    portfolio: 'view',
    authoring: 'approve',
    submissions: 'approve',
    safety: 'approve',
    clinical: 'view',
    quality: 'approve',
    admin: 'none',
  },
  publisher: {
    portfolio: 'view',
    authoring: 'approve',
    submissions: 'admin',
    safety: 'view',
    clinical: 'view',
    quality: 'view',
    admin: 'view',
  },
  admin: {
    portfolio: 'admin',
    authoring: 'admin',
    submissions: 'admin',
    safety: 'admin',
    clinical: 'admin',
    quality: 'admin',
    admin: 'admin',
  },
};

// ============================================================================
// DEMO PERSONAS
// ============================================================================

/**
 * Pre-configured personas for demo switching
 * Maps to users in users-data.ts
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'persona-admin',
    userId: 'u-12', // Chris Wilson - System Administrator
    role: 'admin',
    label: 'System Administrator',
    description: 'Full platform access for configuration and oversight',
    permissions: ROLE_PERMISSIONS.admin,
  },
  {
    id: 'persona-vp-reg',
    userId: 'u-1', // Sarah Chen - VP Regulatory Operations
    role: 'approver',
    label: 'VP Regulatory Operations',
    description: 'Strategic oversight with approval authority',
    permissions: {
      ...ROLE_PERMISSIONS.approver,
      portfolio: 'admin',
      submissions: 'admin',
    },
  },
  {
    id: 'persona-svp-reg',
    userId: 'u-8', // Robert Johnson - SVP Regulatory
    role: 'admin',
    label: 'SVP Regulatory Affairs',
    description: 'Executive oversight of all regulatory operations',
    permissions: ROLE_PERMISSIONS.admin,
  },
  {
    id: 'persona-med-writer',
    userId: 'u-3', // Jennifer Walsh - Senior Medical Writer
    role: 'author',
    label: 'Medical Writer',
    description: 'Document authoring and content creation',
    permissions: {
      ...ROLE_PERMISSIONS.author,
      authoring: 'edit',
    },
  },
  {
    id: 'persona-cmc-lead',
    userId: 'u-2', // Michael Roberts - CMC Lead
    role: 'reviewer',
    label: 'CMC Lead',
    description: 'CMC document review and quality oversight',
    permissions: {
      ...ROLE_PERMISSIONS.reviewer,
      quality: 'approve',
    },
  },
  {
    id: 'persona-clinical-lead',
    userId: 'u-4', // David Kim - Clinical Lead
    role: 'reviewer',
    label: 'Clinical Lead',
    description: 'Clinical operations and trial oversight',
    permissions: {
      ...ROLE_PERMISSIONS.reviewer,
      clinical: 'admin',
    },
  },
  {
    id: 'persona-publisher',
    userId: 'u-5', // Emily Thompson - Publishing Specialist
    role: 'publisher',
    label: 'Publishing Specialist',
    description: 'eCTD compilation and gateway submission',
    permissions: ROLE_PERMISSIONS.publisher,
  },
  {
    id: 'persona-qa-manager',
    userId: 'u-6', // James Martinez - QA Manager
    role: 'approver',
    label: 'QA Manager',
    description: 'Quality assurance and compliance oversight',
    permissions: {
      ...ROLE_PERMISSIONS.approver,
      quality: 'admin',
    },
  },
  {
    id: 'persona-safety',
    userId: 'u-7', // Lisa Park - Safety Scientist
    role: 'reviewer',
    label: 'Safety Scientist',
    description: 'Pharmacovigilance and signal detection',
    permissions: {
      ...ROLE_PERMISSIONS.reviewer,
      safety: 'admin',
    },
  },
  {
    id: 'persona-rpm',
    userId: 'u-9', // Amanda Foster - Regulatory Project Manager
    role: 'reviewer',
    label: 'Regulatory Project Manager',
    description: 'Project coordination and timeline management',
    permissions: ROLE_PERMISSIONS.reviewer,
  },
  {
    id: 'persona-labeling',
    userId: 'u-11', // Rachel Green - Labeling Specialist
    role: 'author',
    label: 'Labeling Specialist',
    description: 'Label content authoring and compliance',
    permissions: ROLE_PERMISSIONS.author,
  },
  {
    id: 'persona-viewer',
    userId: 'u-10', // Tom Anderson - Nonclinical Lead (away)
    role: 'viewer',
    label: 'Read-Only Viewer',
    description: 'View-only access for external stakeholders',
    permissions: ROLE_PERMISSIONS.viewer,
  },
];

// ============================================================================
// STORE
// ============================================================================

interface SessionActions {
  // User switching
  switchUser: (userId: string) => void;
  switchToPersona: (personaId: string) => void;
  
  // Role management
  setRole: (role: PlatformRole) => void;
  setModulePermission: (module: keyof ModulePermissions, level: ModulePermission) => void;
  
  // Permission checks
  canView: (module: keyof ModulePermissions) => boolean;
  canEdit: (module: keyof ModulePermissions) => boolean;
  canApprove: (module: keyof ModulePermissions) => boolean;
  canAdmin: (module: keyof ModulePermissions) => boolean;
  hasPermission: (module: keyof ModulePermissions, required: ModulePermission) => boolean;
  
  // Session management
  updateActivity: () => void;
  resetSession: () => void;
}

type SessionStore = SessionState & SessionActions;

// Default user: Sarah Chen (VP Regulatory Operations)
const DEFAULT_USER_ID = 'u-1';
const DEFAULT_PERSONA_ID = 'persona-vp-reg';

const getInitialUser = (): User | null => {
  return users.find(u => u.id === DEFAULT_USER_ID) || users[0] || null;
};

const getInitialPersona = (): DemoPersona | null => {
  return DEMO_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID) || DEMO_PERSONAS[0] || null;
};

export const useSessionStore = create<SessionStore>()(
  devtools(
    persist(
      (set, get) => {
        const initialPersona = getInitialPersona();
        const initialUser = getInitialUser();
        
        return {
          // Initial state
          currentUserId: initialUser?.id || DEFAULT_USER_ID,
          currentUser: initialUser,
          currentRole: initialPersona?.role || 'admin',
          permissions: initialPersona?.permissions || ROLE_PERMISSIONS.admin,
          sessionStarted: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          activePersonaId: initialPersona?.id || DEFAULT_PERSONA_ID,
          
          // Actions
          switchUser: (userId) => {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            
            // Find persona that matches this user, or keep current role
            const matchingPersona = DEMO_PERSONAS.find(p => p.userId === userId);
            
            set({
              currentUserId: userId,
              currentUser: user,
              currentRole: matchingPersona?.role || get().currentRole,
              permissions: matchingPersona?.permissions || get().permissions,
              activePersonaId: matchingPersona?.id || null,
              lastActivity: new Date().toISOString(),
            }, false, 'switchUser');
          },
          
          switchToPersona: (personaId) => {
            const persona = DEMO_PERSONAS.find(p => p.id === personaId);
            if (!persona) return;
            
            const user = users.find(u => u.id === persona.userId);
            
            set({
              currentUserId: persona.userId,
              currentUser: user || null,
              currentRole: persona.role,
              permissions: persona.permissions,
              activePersonaId: personaId,
              lastActivity: new Date().toISOString(),
            }, false, 'switchToPersona');
          },
          
          setRole: (role) => {
            set({
              currentRole: role,
              permissions: ROLE_PERMISSIONS[role],
              activePersonaId: null, // Clear persona when manually setting role
              lastActivity: new Date().toISOString(),
            }, false, 'setRole');
          },
          
          setModulePermission: (module, level) => {
            set((state) => ({
              permissions: {
                ...state.permissions,
                [module]: level,
              },
              activePersonaId: null, // Clear persona when manually adjusting
              lastActivity: new Date().toISOString(),
            }), false, 'setModulePermission');
          },
          
          // Permission checks (hierarchical: admin > approve > edit > view > none)
          canView: (module) => {
            const level = get().permissions[module];
            return level !== 'none';
          },
          
          canEdit: (module) => {
            const level = get().permissions[module];
            return level === 'edit' || level === 'approve' || level === 'admin';
          },
          
          canApprove: (module) => {
            const level = get().permissions[module];
            return level === 'approve' || level === 'admin';
          },
          
          canAdmin: (module) => {
            const level = get().permissions[module];
            return level === 'admin';
          },
          
          hasPermission: (module, required) => {
            const level = get().permissions[module];
            const hierarchy: ModulePermission[] = ['none', 'view', 'edit', 'approve', 'admin'];
            return hierarchy.indexOf(level) >= hierarchy.indexOf(required);
          },
          
          updateActivity: () => {
            set({ lastActivity: new Date().toISOString() }, false, 'updateActivity');
          },
          
          resetSession: () => {
            const initialPersona = getInitialPersona();
            const initialUser = getInitialUser();
            
            set({
              currentUserId: initialUser?.id || DEFAULT_USER_ID,
              currentUser: initialUser,
              currentRole: initialPersona?.role || 'admin',
              permissions: initialPersona?.permissions || ROLE_PERMISSIONS.admin,
              sessionStarted: new Date().toISOString(),
              lastActivity: new Date().toISOString(),
              activePersonaId: initialPersona?.id || DEFAULT_PERSONA_ID,
            }, false, 'resetSession');
          },
        };
      },
      {
        name: 'ligature-session-storage',
        partialize: (state) => ({
          currentUserId: state.currentUserId,
          currentRole: state.currentRole,
          permissions: state.permissions,
          activePersonaId: state.activePersonaId,
        }),
        // Merge persisted state with initial state, syncing currentUser
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<SessionState>;
          // Sync currentUser with the persisted userId
          const user = persisted.currentUserId 
            ? users.find(u => u.id === persisted.currentUserId) 
            : currentState.currentUser;
          return {
            ...currentState,
            ...persisted,
            currentUser: user || currentState.currentUser,
          };
        },
      }
    ),
    { name: 'LigatureSession' }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useCurrentUser = () => useSessionStore((s) => s.currentUser);
export const useCurrentRole = () => useSessionStore((s) => s.currentRole);
export const usePermissions = () => useSessionStore((s) => s.permissions);
export const useActivePersona = () => {
  const personaId = useSessionStore((s) => s.activePersonaId);
  return personaId ? DEMO_PERSONAS.find(p => p.id === personaId) : null;
};

// Permission hooks for specific modules
export const useCanViewModule = (module: keyof ModulePermissions) => 
  useSessionStore((s) => s.canView(module));
export const useCanEditModule = (module: keyof ModulePermissions) => 
  useSessionStore((s) => s.canEdit(module));
export const useCanApproveModule = (module: keyof ModulePermissions) => 
  useSessionStore((s) => s.canApprove(module));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get role display label
 */
export const getRoleLabel = (role: PlatformRole): string => {
  const labels: Record<PlatformRole, string> = {
    viewer: 'Viewer',
    author: 'Author',
    reviewer: 'Reviewer',
    approver: 'Approver',
    publisher: 'Publisher',
    admin: 'Administrator',
  };
  return labels[role];
};

/**
 * Get role color for badges
 */
export const getRoleColor = (role: PlatformRole): string => {
  const colors: Record<PlatformRole, string> = {
    viewer: 'slate',
    author: 'blue',
    reviewer: 'amber',
    approver: 'green',
    publisher: 'purple',
    admin: 'red',
  };
  return colors[role];
};

/**
 * Get permission level label
 */
export const getPermissionLabel = (level: ModulePermission): string => {
  const labels: Record<ModulePermission, string> = {
    none: 'No Access',
    view: 'View Only',
    edit: 'Edit',
    approve: 'Approve',
    admin: 'Full Access',
  };
  return labels[level];
};
