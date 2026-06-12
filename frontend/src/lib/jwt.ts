
/**
 * JWT Utilities
 * Token creation and verification using jose library
 * Version: 0.13.10
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { JWT_CONFIG } from '@/config/auth-config';

// =============================================================================
// TYPES
// =============================================================================

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  sessionId: string;
  /** Tenant UUID — embedded at login time, forwarded by middleware as x-tenant-id */
  tenantId?: string;
  // Explicitly declare JWT standard claims for TypeScript
  exp?: number;
  iat?: number;
}

export interface TokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  payload?: TokenPayload;
  error?: string;
  expired?: boolean;
}

// =============================================================================
// KEY ENCODING
// =============================================================================

/**
 * Get the secret key as Uint8Array for jose
 */
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_CONFIG.secret);
}

// =============================================================================
// TOKEN CREATION
// =============================================================================

/**
 * Create a signed JWT token
 */
export async function createToken(payload: {
  userId: string;
  email: string;
  role: string;
  name: string;
  sessionId: string;
  tenantId?: string;
  appVersion?: string;
}): Promise<TokenResult> {
  try {
    const token = await new SignJWT({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      sessionId: payload.sessionId,
      tenantId: payload.tenantId,
      appVersion: payload.appVersion,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(JWT_CONFIG.issuer)
      .setAudience(JWT_CONFIG.audience)
      .setExpirationTime(JWT_CONFIG.expiresIn)
      .sign(getSecretKey());

    return { success: true, token };
  } catch (error) {
    console.error('Token creation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create token' 
    };
  }
}

// =============================================================================
// TOKEN VERIFICATION
// =============================================================================

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    });

    // Type assertion after verification
    const typedPayload = payload as TokenPayload;

    // Validate required fields
    if (!typedPayload.userId || !typedPayload.email || !typedPayload.role) {
      return { success: false, error: 'Invalid token payload' };
    }

    return { success: true, payload: typedPayload };
  } catch (error) {
    // Check for expiration
    if (error instanceof Error && error.message.includes('exp')) {
      return { success: false, error: 'Token expired', expired: true };
    }

    console.error('Token verification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Token verification failed' 
    };
  }
}

// =============================================================================
// TOKEN REFRESH
// =============================================================================

/**
 * Refresh a token if it's close to expiry
 * Returns new token if refreshed, null if not needed or invalid
 */
export async function refreshTokenIfNeeded(
  token: string,
  refreshBeforeMinutes: number = 30
): Promise<TokenResult | null> {
  const result = await verifyToken(token);
  
  if (!result.success || !result.payload) {
    return null;
  }

  const payload = result.payload;
  const exp = payload.exp;
  
  if (!exp) {
    return null;
  }

  // Check if token expires within the refresh window
  const expiresAt = new Date(exp * 1000);
  const refreshThreshold = new Date();
  refreshThreshold.setMinutes(refreshThreshold.getMinutes() + refreshBeforeMinutes);

  if (expiresAt <= refreshThreshold) {
    // Token is close to expiry, create a new one
    return createToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      sessionId: payload.sessionId,
    });
  }

  // Token doesn't need refresh
  return null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const JWTUtils = {
  createToken,
  verifyToken,
  refreshTokenIfNeeded,
};
