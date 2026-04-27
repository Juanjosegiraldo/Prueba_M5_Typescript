// ============================================================
// Reusable authentication helpers
// ============================================================

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import type { JwtPayload, AuthUser } from '@/types/auth.types';

/**
 * Extracts and verifies the JWT from the request.
 * Returns the payload or null when there is no valid session.
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET || 'secret_de_respaldo';
    const payload = jwt.verify(token, secret) as JwtPayload;

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: '',
    };
  } catch {
    return null;
  }
}

/**
 * Checks whether the user is an ADMIN.
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN';
}

/**
 * Checks whether the user owns the resource or is an ADMIN.
 */
export function canModify(user: AuthUser, resourceOwnerId: string): boolean {
  return user.role === 'ADMIN' || user.id === resourceOwnerId;
}
