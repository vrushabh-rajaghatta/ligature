
/**
 * Authentication Configuration
 * Part 11 compliant settings for JWT and session management
 * Version: 0.13.10
 */

// =============================================================================
// JWT CONFIGURATION
// =============================================================================

export const JWT_CONFIG = {
  // Secret key - must be set via JWT_SECRET env var (no fallback)
  get secret(): string {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('JWT_SECRET required');
    return s;
  },
  
  // Token expiration (Part 11: reasonable session timeout)
  expiresIn: '8h', // 8 hours max session
  
  // Issuer for token validation
  issuer: 'ligature',
  
  // Audience
  audience: 'ligature-app',
};

// =============================================================================
// COOKIE CONFIGURATION
// =============================================================================

export const COOKIE_CONFIG = {
  // Cookie name
  name: 'ligature-session',
  
  // HTTP-only prevents XSS attacks
  httpOnly: true,
  
  // Secure in production (HTTPS only)
  secure: process.env.NODE_ENV === 'production',
  
  // Same-site strict for CSRF protection
  sameSite: 'lax' as const,
  
  // Path
  path: '/',
  
  // Max age in seconds (8 hours)
  maxAge: 8 * 60 * 60,
};

// =============================================================================
// SESSION CONFIGURATION (Part 11 Compliance)
// =============================================================================

export const SESSION_CONFIG = {
  // Inactivity timeout in minutes (Part 11 requirement)
  inactivityTimeoutMinutes: 15,
  
  // Maximum session duration in hours
  maxSessionHours: 8,
  
  // Maximum concurrent sessions per user
  maxConcurrentSessions: 3,
  
  // Refresh token before expiry (in minutes)
  refreshBeforeExpiryMinutes: 30,
};

// =============================================================================
// LOCKOUT CONFIGURATION
// =============================================================================

export const LOCKOUT_CONFIG = {
  // Maximum failed login attempts before lockout
  maxFailedAttempts: 5,
  
  // Lockout duration in minutes
  lockoutDurationMinutes: 30,
  
  // Reset failed attempt counter after minutes of no attempts
  resetAttemptsAfterMinutes: 15,
};

// =============================================================================
// MOCK USERS (Replace with DB in Phase 1.1)
// =============================================================================

export interface MockUser {
  id: string;
  email: string;
  password: string; // Plain text for mock - will be hashed in DB
  name: string;
  role: 'ADMIN' | 'REGULATORY_AFFAIRS' | 'MEDICAL_WRITER' | 'QA' | 'CLINICAL' | 'CMC' | 'SAFETY' | 'USER';
  department?: string;
  title?: string;
  isActive: boolean;
  mfaEnabled: boolean;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'user-001',
    email: 'admin@ligaturerd.io',
    password: 'Ligature2026!',
    name: 'Sarah Chen',
    role: 'ADMIN',
    department: 'Regulatory Affairs',
    title: 'VP Regulatory Affairs',
    isActive: true,
    mfaEnabled: false,
  },
  {
    id: 'user-002',
    email: 'ra@ligaturerd.io',
    password: 'Ligature2026!',
    name: 'Michael Torres',
    role: 'REGULATORY_AFFAIRS',
    department: 'Regulatory Affairs',
    title: 'Senior Regulatory Specialist',
    isActive: true,
    mfaEnabled: false,
  },
  {
    id: 'user-003',
    email: 'writer@ligaturerd.io',
    password: 'Ligature2026!',
    name: 'Emily Watson',
    role: 'MEDICAL_WRITER',
    department: 'Medical Writing',
    title: 'Lead Medical Writer',
    isActive: true,
    mfaEnabled: false,
  },
  {
    id: 'user-004',
    email: 'qa@ligaturerd.io',
    password: 'Ligature2026!',
    name: 'James Park',
    role: 'QA',
    department: 'Quality Assurance',
    title: 'QA Manager',
    isActive: true,
    mfaEnabled: false,
  },
  {
    id: 'user-005',
    email: 'safety@ligaturerd.io',
    password: 'Ligature2026!',
    name: 'Lisa Rodriguez',
    role: 'SAFETY',
    department: 'Drug Safety',
    title: 'Pharmacovigilance Lead',
    isActive: true,
    mfaEnabled: false,
  },
];

/**
 * Find mock user by email
 */
export function findMockUserByEmail(email: string): MockUser | undefined {
  return MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Validate mock user credentials
 */
export function validateMockCredentials(email: string, password: string): MockUser | null {
  const user = findMockUserByEmail(email);
  if (!user) return null;
  if (!user.isActive) return null;
  if (user.password !== password) return null;
  return user;
}
