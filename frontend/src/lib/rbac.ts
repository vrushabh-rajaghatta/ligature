
/**
 * Role-Based Access Control (RBAC) Library
 * Part 11 compliant access control for Ligature
 * 
 * Note: This module is Edge-runtime compatible (no Prisma imports)
 * 
 * @version 0.13.21
 * @bite 1.3d - RBAC Middleware
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * User roles (mirrors Prisma UserRole enum)
 * Defined here to avoid Edge runtime issues with Prisma imports
 */
export type UserRole = 
  | 'ADMIN'
  | 'REGULATORY_AFFAIRS'
  | 'MEDICAL_WRITER'
  | 'QA'
  | 'CLINICAL'
  | 'CMC'
  | 'SAFETY'
  | 'USER';

export type Permission = 'READ' | 'WRITE' | 'DELETE' | 'APPROVE' | 'ADMIN';

export type Resource = 
  | 'products'
  | 'applications'
  | 'submissions'
  | 'haqs'
  | 'documents'
  | 'studies'
  | 'safety'
  | 'users'
  | 'audit'
  | 'system';

export interface RolePermissions {
  role: UserRole;
  permissions: Map<Resource, Permission[]>;
}

// =============================================================================
// ROLE HIERARCHY
// =============================================================================

/**
 * Role hierarchy - higher level roles inherit permissions from lower levels
 * ADMIN > REGULATORY_AFFAIRS > others > USER
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 100,
  REGULATORY_AFFAIRS: 80,
  QA: 70,
  SAFETY: 60,
  CLINICAL: 60,
  CMC: 60,
  MEDICAL_WRITER: 50,
  USER: 10,
};

// =============================================================================
// PERMISSION MATRIX
// =============================================================================

/**
 * Define what each role can do with each resource
 * R = READ, W = WRITE, D = DELETE, A = APPROVE, X = ADMIN
 */
const PERMISSION_MATRIX: Record<UserRole, Partial<Record<Resource, Permission[]>>> = {
  ADMIN: {
    // Admin has full access to everything
    products: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    applications: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    submissions: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    haqs: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    documents: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    studies: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    safety: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    users: ['READ', 'WRITE', 'DELETE', 'APPROVE', 'ADMIN'],
    audit: ['READ', 'ADMIN'],
    system: ['READ', 'WRITE', 'ADMIN'],
  },
  
  REGULATORY_AFFAIRS: {
    products: ['READ', 'WRITE'],
    applications: ['READ', 'WRITE', 'DELETE', 'APPROVE'],
    submissions: ['READ', 'WRITE', 'DELETE', 'APPROVE'],
    haqs: ['READ', 'WRITE', 'DELETE', 'APPROVE'],
    documents: ['READ', 'WRITE', 'APPROVE'],
    studies: ['READ'],
    safety: ['READ'],
    users: ['READ'],
    audit: ['READ'],
    system: ['READ'],
  },
  
  QA: {
    products: ['READ'],
    applications: ['READ'],
    submissions: ['READ', 'APPROVE'], // QA can approve but not modify
    haqs: ['READ'],
    documents: ['READ', 'WRITE', 'APPROVE'],
    studies: ['READ'],
    safety: ['READ'],
    users: ['READ'],
    audit: ['READ'],
    system: ['READ'],
  },
  
  SAFETY: {
    products: ['READ'],
    applications: ['READ'],
    submissions: ['READ'],
    haqs: ['READ'],
    documents: ['READ', 'WRITE'],
    studies: ['READ'],
    safety: ['READ', 'WRITE', 'DELETE', 'APPROVE'],
    users: ['READ'],
    audit: ['READ'],
    system: ['READ'],
  },
  
  CLINICAL: {
    products: ['READ'],
    applications: ['READ'],
    submissions: ['READ'],
    haqs: ['READ'],
    documents: ['READ', 'WRITE'],
    studies: ['READ', 'WRITE', 'DELETE'],
    safety: ['READ', 'WRITE'],
    users: ['READ'],
    audit: ['READ'],
    system: ['READ'],
  },
  
  CMC: {
    products: ['READ', 'WRITE'],
    applications: ['READ'],
    submissions: ['READ'],
    haqs: ['READ', 'WRITE'],
    documents: ['READ', 'WRITE'],
    studies: ['READ'],
    safety: ['READ'],
    users: ['READ'],
    audit: ['READ'],
    system: ['READ'],
  },
  
  MEDICAL_WRITER: {
    products: ['READ'],
    applications: ['READ'],
    submissions: ['READ'],
    haqs: ['READ', 'WRITE'],
    documents: ['READ', 'WRITE'],
    studies: ['READ'],
    safety: ['READ'],
    users: ['READ'],
    audit: ['READ'],
    system: ['READ'],
  },
  
  USER: {
    // Basic read-only access
    products: ['READ'],
    applications: ['READ'],
    submissions: ['READ'],
    haqs: ['READ'],
    documents: ['READ'],
    studies: ['READ'],
    safety: ['READ'],
    users: [],
    audit: [],
    system: ['READ'],
  },
};

// =============================================================================
// API ROUTE TO RESOURCE MAPPING
// =============================================================================

/**
 * Map API routes to resources
 */
export const ROUTE_RESOURCE_MAP: Record<string, Resource> = {
  // Core entities
  '/api/products': 'products',
  '/api/applications': 'applications',
  '/api/submissions': 'submissions',
  '/api/haqs': 'haqs',
  '/api/haq': 'haqs',
  '/api/documents': 'documents',
  '/api/studies': 'studies',
  '/api/safety': 'safety',
  '/api/users': 'users',
  // Auth sub-routes (GxP compliance endpoints)
  '/api/auth/permissions': 'users',
  '/api/auth/entitlements': 'users',
  '/api/auth/esig-config': 'users',
  '/api/auth/part11': 'users',
  '/api/auth/mfa': 'users',
  '/api/auth/mfa-config': 'users',
  '/api/auth/mfa-status': 'users',
  '/api/auth/audit-events': 'audit',
  '/api/auth/audit-log': 'audit',
  '/api/auth/login-audit': 'audit',
  '/api/auth/session-policy': 'users',
  '/api/audit': 'audit',
  '/api/upload': 'documents',
  '/api/system': 'system',
  '/api/admin': 'system',
  '/api/agents': 'documents',
  // AI services
  '/api/ai': 'documents',
  '/api/rag': 'documents',
  // Domain modules
  '/api/authoring': 'documents',
  '/api/document-control': 'documents',
  '/api/tmf': 'documents',
  '/api/ctms': 'studies',
  '/api/qms': 'documents',
  '/api/eln': 'documents',
  '/api/glp': 'documents',
  '/api/research': 'documents',
  '/api/usdm': 'studies',
  '/api/idmp': 'products',
  '/api/spl': 'documents',
  '/api/stability': 'documents',
  '/api/signatures': 'audit',
  '/api/gateways': 'submissions',
  '/api/cross-module': 'documents',
  '/api/collaboration': 'documents',
  '/api/smart-submissions': 'submissions',
  '/api/adam': 'documents',
  '/api/define-xml': 'documents',
  '/api/cdisc-terminology': 'documents',
};

/**
 * Map HTTP methods to permissions
 */
export const METHOD_PERMISSION_MAP: Record<string, Permission> = {
  GET: 'READ',
  POST: 'WRITE',
  PUT: 'WRITE',
  PATCH: 'WRITE',
  DELETE: 'DELETE',
};

// =============================================================================
// ROLE NORMALIZATION
// =============================================================================

// Map lowercase/hyphenated roles (from JWT/invite flow) to RBAC UserRole
const ROLE_NORMALIZE_MAP: Record<string, UserRole> = {
  'admin': 'ADMIN',
  'regulatory-affairs': 'REGULATORY_AFFAIRS',
  'regulatory_affairs': 'REGULATORY_AFFAIRS',
  'regulatory_lead': 'REGULATORY_AFFAIRS',
  'regulatory-lead': 'REGULATORY_AFFAIRS',
  'medical-writer': 'MEDICAL_WRITER',
  'medical_writer': 'MEDICAL_WRITER',
  'reviewer': 'USER',
  'safety-officer': 'SAFETY',
  'safety_officer': 'SAFETY',
  'clinical-ops': 'CLINICAL',
  'clinical_ops': 'CLINICAL',
  'qa': 'QA',
  'cmc': 'CMC',
  'user': 'USER',
};

export function normalizeRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  // Already a valid uppercase role
  if (Object.keys(ROLE_HIERARCHY).includes(role)) return role as UserRole;
  // Try normalization map
  return ROLE_NORMALIZE_MAP[role.toLowerCase()] || null;
}
// =============================================================================

/**
 * Check if a role has a specific permission on a resource
 */
export function hasPermission(
  role: UserRole,
  resource: Resource,
  permission: Permission
): boolean {
  const rolePermissions = PERMISSION_MATRIX[role];
  if (!rolePermissions) return false;
  
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(permission);
}

/**
 * Check if a role can access a route with a specific HTTP method
 */
export function canAccessRoute(
  role: UserRole,
  routePath: string,
  method: string
): boolean {
  // Find the matching resource for this route
  const resource = getResourceFromRoute(routePath);
  if (!resource) {
    // If route is not mapped, deny by default (secure by default)
    console.warn(`[RBAC] Unmapped route: ${routePath}`);
    return false;
  }
  
  // Get the required permission for this HTTP method
  const permission = METHOD_PERMISSION_MAP[method.toUpperCase()];
  if (!permission) {
    console.warn(`[RBAC] Unknown HTTP method: ${method}`);
    return false;
  }
  
  return hasPermission(role, resource, permission);
}

/**
 * Get the resource from a route path
 */
export function getResourceFromRoute(routePath: string): Resource | null {
  // Normalize the path (remove trailing slash, query params)
  const normalizedPath = routePath.split('?')[0].replace(/\/$/, '');
  
  // Check for exact match first
  if (ROUTE_RESOURCE_MAP[normalizedPath]) {
    return ROUTE_RESOURCE_MAP[normalizedPath];
  }
  
  // Check for prefix match (e.g., /api/products/123 matches /api/products)
  for (const [route, resource] of Object.entries(ROUTE_RESOURCE_MAP)) {
    if (normalizedPath.startsWith(route)) {
      return resource;
    }
  }
  
  return null;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Map<Resource, Permission[]> {
  const permissions = new Map<Resource, Permission[]>();
  const rolePerms = PERMISSION_MATRIX[role];
  
  if (rolePerms) {
    for (const [resource, perms] of Object.entries(rolePerms)) {
      if (perms && perms.length > 0) {
        permissions.set(resource as Resource, perms);
      }
    }
  }
  
  return permissions;
}

/**
 * Check if a role is at or above a certain level in the hierarchy
 */
export function isRoleAtLeast(role: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Get the display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    REGULATORY_AFFAIRS: 'Regulatory Affairs',
    MEDICAL_WRITER: 'Medical Writer',
    QA: 'Quality Assurance',
    CLINICAL: 'Clinical Operations',
    CMC: 'CMC',
    SAFETY: 'Drug Safety',
    USER: 'User',
  };
  return displayNames[role] || role;
}

// =============================================================================
// RBAC ERROR TYPES
// =============================================================================

export class RBACError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_ROLE',
    message: string,
    public details?: {
      role?: string;
      resource?: string;
      permission?: string;
      route?: string;
    }
  ) {
    super(message);
    this.name = 'RBACError';
  }
}

// =============================================================================
// RBAC CHECK RESULT
// =============================================================================

export interface RBACCheckResult {
  allowed: boolean;
  reason?: string;
  role?: UserRole;
  resource?: Resource;
  permission?: Permission;
}

/**
 * Perform a complete RBAC check and return detailed result
 */
export function checkAccess(
  role: UserRole | null | undefined,
  routePath: string,
  method: string
): RBACCheckResult {
  // No role means not authenticated
  if (!role) {
    return {
      allowed: false,
      reason: 'Authentication required',
    };
  }

  // Normalize role (handles lowercase/hyphenated variants from JWT)
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return {
      allowed: false,
      reason: `Invalid role: ${role}`,
      role,
    };
  }
  const effectiveRole = normalizedRole;
  
  // Get resource from route
  const resource = getResourceFromRoute(routePath);
  if (!resource) {
    return {
      allowed: false,
      reason: `Route not mapped to resource: ${routePath}`,
      role: effectiveRole,
    };
  }
  
  // Get permission from method
  const permission = METHOD_PERMISSION_MAP[method.toUpperCase()] as Permission;
  if (!permission) {
    return {
      allowed: false,
      reason: `Unknown HTTP method: ${method}`,
      role: effectiveRole,
      resource,
    };
  }
  
  // Check permission
  const allowed = hasPermission(effectiveRole, resource, permission);
  
  return {
    allowed,
    reason: allowed 
      ? undefined 
      : `Role ${effectiveRole} does not have ${permission} permission on ${resource}`,
    role: effectiveRole,
    resource,
    permission,
  };
}
