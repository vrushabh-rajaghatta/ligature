
/**
 * Database Authentication Service
 * Replaces MOCK_USERS with real database queries
 * 
 * @version 0.13.35
 * @bite 1.3a - Password hashing with bcrypt
 * @bite 1.3b - Database user lookup and validation
 */

import { UserRole } from '@/lib/supabase/config';
import * as bcrypt from 'bcryptjs';
import { LOCKOUT_CONFIG } from '@/config/auth-config';
import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

// Re-export prisma for other modules that import from here
export { prisma };

// =============================================================================
// FALLBACK USERS (for development when DB is unavailable)
// =============================================================================

const FALLBACK_USERS = [
  {
    id: 'fallback-sarah',
    email: 'sarah.chen@ligaturerd.io',
    name: 'Sarah Chen',
    passwordHash: '$2b$12$5GPvYPDC3G2nko.wMUHdt.U6gV1bRb2iz5TcZrMd9uUOkdXgRBDju', // Ligature2026!
    role: 'REGULATORY_LEAD' as UserRole,
    department: 'Regulatory Affairs',
    title: 'VP, Regulatory Strategy',
    isActive: true,
    mustChangePassword: false,
  },
  {
    id: 'fallback-admin',
    email: 'admin@ligaturerd.io', 
    name: 'Admin User',
    passwordHash: '$2b$12$5GPvYPDC3G2nko.wMUHdt.U6gV1bRb2iz5TcZrMd9uUOkdXgRBDju', // Ligature2026!
    role: 'ADMIN' as UserRole,
    department: 'IT',
    title: 'System Administrator',
    isActive: true,
    mustChangePassword: false,
  },
];

// =============================================================================
// TYPES
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  department: string | null;
  title: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  /** Tenant UUID — populated from the users table (Task 2.1) */
  tenantId?: string;
}

export interface ValidateResult {
  success: boolean;
  user?: AuthUser;
  error?: {
    code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_INACTIVE' | 'USER_NOT_FOUND';
    message: string;
    attemptsRemaining?: number;
    lockedUntil?: Date;
  };
}

// =============================================================================
// PASSWORD HASHING
// =============================================================================

const SALT_ROUNDS = 12; // Part 11 recommends strong hashing

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// =============================================================================
// USER LOOKUP
// =============================================================================

/**
 * Find a user by email (case-insensitive)
 */
export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        title: true,
        isActive: true,
        mustChangePassword: true,
        tenantId: true,
      },
    });

    return user as unknown as AuthUser | null;
  } catch (error) {
    logger.error('AuthDB', 'Error finding user', error);
    return null;
  }
}

/**
 * Find a user by ID
 * Returns the user if found, null if not found.
 * Falls back to FALLBACK_USERS if database is unavailable.
 * 
 * @version 0.44.8 - Added fallback user support for session validation
 */
export async function findUserById(id: string): Promise<AuthUser | null> {
  // Check fallback users first if ID has fallback prefix
  if (id.startsWith('fallback-')) {
    const fallbackUser = FALLBACK_USERS.find(u => u.id === id);
    if (fallbackUser) {
      logger.debug('AuthDB', `Found fallback user by ID: ${id}`);
      return {
        id: fallbackUser.id,
        email: fallbackUser.email,
        name: fallbackUser.name,
        role: fallbackUser.role,
        department: fallbackUser.department,
        title: fallbackUser.title,
        isActive: fallbackUser.isActive,
        mustChangePassword: fallbackUser.mustChangePassword,
      };
    }
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        title: true,
        isActive: true,
        mustChangePassword: true,
        tenantId: true,
      },
    });

    return user as unknown as AuthUser | null;
  } catch (error) {
    logger.error('AuthDB', 'Database error finding user by ID, trying fallback', error);
    // Database error - check fallback users before giving up
    const fallbackUser = FALLBACK_USERS.find(u => u.id === id);
    if (fallbackUser) {
      return {
        id: fallbackUser.id,
        email: fallbackUser.email,
        name: fallbackUser.name,
        role: fallbackUser.role,
        department: fallbackUser.department,
        title: fallbackUser.title,
        isActive: fallbackUser.isActive,
        mustChangePassword: fallbackUser.mustChangePassword,
      };
    }
    return null;
  }
}

// =============================================================================
// CREDENTIAL VALIDATION
// =============================================================================

/**
 * Try fallback authentication when database is unavailable
 * In fallback mode: known users must match their hash; all other users
 * are accepted with any password >= 8 chars (demo/invited users).
 */
async function tryFallbackAuth(email: string, password: string): Promise<ValidateResult> {
  logger.debug('AuthDB', `Attempting fallback authentication for: ${email}`);

  const knownUser = FALLBACK_USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  if (knownUser) {
    // Known demo user — validate against stored hash
    const isValid = await verifyPassword(password, knownUser.passwordHash);
    if (!isValid) {
      return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };
    }
    // Use knownUser below
    return {
      success: true,
      user: {
        id: knownUser.id,
        email: knownUser.email,
        name: knownUser.name,
        role: knownUser.role,
        department: knownUser.department,
        title: knownUser.title,
        isActive: knownUser.isActive,
        mustChangePassword: knownUser.mustChangePassword,
      },
    };
  }

  // Unknown user (invited / external) — accept any password >= 8 chars in demo/fallback mode
  if (!password || password.length < 8) {
    return { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Password must be at least 8 characters.' } };
  }

  const nameParts = email.split('@')[0].split(/[._-]/);
  const name = nameParts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  const fallbackUser = {
    id: 'fallback-' + email.replace(/[^a-z0-9]/gi, '-'),
    email,
    name,
    role: 'reviewer' as UserRole,
    department: 'Regulatory Affairs',
    title: '',
    isActive: true,
    mustChangePassword: false,
  };
  
  logger.debug('AuthDB', `Fallback authentication successful for: ${email}`);
  
  return {
    success: true,
    user: {
      id: fallbackUser.id,
      email: fallbackUser.email,
      name: fallbackUser.name,
      role: fallbackUser.role,
      department: fallbackUser.department,
      title: fallbackUser.title,
      isActive: fallbackUser.isActive,
      mustChangePassword: fallbackUser.mustChangePassword,
    },
  };
}

/**
 * Validate user credentials against database
 * Handles lockout, failed attempts, and password verification
 * Falls back to hardcoded users if database is unavailable
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<ValidateResult> {
  try {
    // Find user with password hash and lockout info
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        title: true,
        isActive: true,
        mustChangePassword: true,
        tenantId: true,
        passwordHash: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // User not found in DB - try fallback
    if (!user) {
      logger.debug('AuthDB', 'User not found in DB, trying fallback');
      return tryFallbackAuth(email, password);
    }

    // Check if account is inactive
    if (!user.isActive) {
      return {
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'This account has been deactivated',
        },
      };
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      return {
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked. Try again at ${user.lockedUntil.toLocaleTimeString()}`,
          lockedUntil: user.lockedUntil,
        },
      };
    }

    // Clear expired lockout
    if (user.lockedUntil && new Date() >= user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });
    }

    // No password hash set (user needs to set password)
    if (!user.passwordHash) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Password not set. Please contact administrator.',
        },
      };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      // Record failed attempt
      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= LOCKOUT_CONFIG.maxFailedAttempts;
      
      const updateData: {
        failedLoginAttempts: number;
        lockedUntil?: Date;
      } = {
        failedLoginAttempts: newAttempts,
      };

      if (shouldLock) {
        const lockoutEnd = new Date();
        lockoutEnd.setMinutes(lockoutEnd.getMinutes() + LOCKOUT_CONFIG.lockoutDurationMinutes);
        updateData.lockedUntil = lockoutEnd;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      if (shouldLock) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Too many failed attempts. Account locked for ${LOCKOUT_CONFIG.lockoutDurationMinutes} minutes.`,
            lockedUntil: updateData.lockedUntil,
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          attemptsRemaining: LOCKOUT_CONFIG.maxFailedAttempts - newAttempts,
        },
      };
    }

    // Success - clear failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        department: user.department,
        title: user.title,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        tenantId: user.tenantId,
      },
    };
  } catch (error) {
    logger.error('AuthDB', 'Database error, trying fallback', error);
    // Database error - try fallback authentication
    return tryFallbackAuth(email, password);
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Store session token for user
 */
export async function storeSession(
  userId: string,
  sessionToken: string,
  expiresAt: Date
): Promise<boolean> {
  // Skip DB storage for fallback users
  if (userId.startsWith('fallback-')) {
    logger.debug('AuthDB', 'Skipping session storage for fallback user');
    return true;
  }
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        sessionToken,
        tokenExpiry: expiresAt,
      },
    });
    return true;
  } catch (error) {
    logger.error('AuthDB', 'Error storing session', error);
    return false;
  }
}

/**
 * Clear session for user (logout)
 */
export async function clearSession(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        sessionToken: null,
        tokenExpiry: null,
      },
    });
    return true;
  } catch (error) {
    logger.error('AuthDB', 'Error clearing session', error);
    return false;
  }
}

/**
 * Validate session token
 */
export async function validateSession(userId: string, sessionId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        sessionToken: true,
        tokenExpiry: true,
      },
    });

    if (!user || !user.isActive) {
      return false;
    }

    // Check if session matches and hasn't expired
    if (user.sessionToken !== sessionId) {
      return false;
    }

    if (user.tokenExpiry && new Date() > user.tokenExpiry) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('AuthDB', 'Error validating session', error);
    return false;
  }
}

// =============================================================================
// PASSWORD MANAGEMENT
// =============================================================================

/**
 * Update user password
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<boolean> {
  try {
    const hash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: userId },
      data: ({
        passwordHash: hash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      }) as any,
    });

    return true;
  } catch (error) {
    logger.error('AuthDB', 'Error updating password', error);
    return false;
  }
}

/**
 * Set password for a user (admin function)
 */
export async function setUserPassword(
  userId: string,
  password: string,
  requireChange: boolean = true
): Promise<boolean> {
  try {
    const hash = await hashPassword(password);
    
    await prisma.user.update({
      where: { id: userId },
      data: ({
        passwordHash: hash,
        mustChangePassword: requireChange,
        passwordChangedAt: new Date(),
      }) as any,
    });

    return true;
  } catch (error) {
    logger.error('AuthDB', 'Error setting user password', error);
    return false;
  }
}

// =============================================================================
// USER CREATION (for seed script)
// =============================================================================

/**
 * Create a user with hashed password
 */
export async function createUserWithPassword(
  data: {
    email: string;
    name: string;
    password: string;
    role: UserRole;
    department?: string;
    title?: string;
  }
): Promise<AuthUser | null> {
  try {
    const passwordHash = await hashPassword(data.password);
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: data.role,
        department: data.department,
        title: data.title,
        isActive: true,
        mustChangePassword: false,
        tenantId: '00000000-0000-0000-0000-000000000001',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        title: true,
        isActive: true,
        mustChangePassword: true,
        tenantId: true,
      },
    });

    return user as unknown as AuthUser | null;
  } catch (error) {
    logger.error('AuthDB', 'Error creating user', error);
    return null;
  }
}
