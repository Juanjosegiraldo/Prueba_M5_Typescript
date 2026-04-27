// ============================================================
// Helpers de autenticación reutilizables
// ============================================================

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import type { JwtPayload, AuthUser } from '@/types/auth.types';

/**
 * Extrae y verifica el JWT del request.
 * Retorna el payload o null si no hay sesión válida.
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
 * Verifica que el usuario sea ADMIN.
 */
export function isAdmin(user: AuthUser): boolean {
  return user.role === 'ADMIN';
}

/**
 * Verifica que el usuario sea dueño del recurso o ADMIN.
 */
export function canModify(user: AuthUser, resourceOwnerId: string): boolean {
  return user.role === 'ADMIN' || user.id === resourceOwnerId;
}
