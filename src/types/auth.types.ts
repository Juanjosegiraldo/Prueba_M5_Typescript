// ============================================================
// INTERFACES de Autenticación
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AGENT';
}

/** DTO para registro de usuario */
export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

/** DTO para login */
export interface LoginDto {
  email: string;
  password: string;
}

/** Payload del JWT */
export interface JwtPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
}
