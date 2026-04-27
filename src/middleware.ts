import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  const authToken    = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith('/dashboard');
  const isAuthPage  = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Verificar si el access token es válido
  let isValidToken = false;
  if (authToken) {
    try {
      const secret = process.env.JWT_SECRET || 'secret_de_respaldo';
      jwt.verify(authToken, secret);
      isValidToken = true;
    } catch {
      isValidToken = false;
    }
  }

  // CASO A: intenta entrar al dashboard
  if (isDashboard) {
    // Token válido → dejar pasar sin parpadeo
    if (isValidToken) return NextResponse.next();
    // No hay refresh token → redirigir a login
    if (!refreshToken) return NextResponse.redirect(new URL('/login', request.url));
    // Hay refresh token pero access expiró → dejar pasar,
    // fetchWithRefresh lo renovará en el cliente
    return NextResponse.next();
  }

  // CASO B: intenta entrar a login/register con sesión activa
  if (isAuthPage && (isValidToken || refreshToken)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
