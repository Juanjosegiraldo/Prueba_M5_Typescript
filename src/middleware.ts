import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function middleware(request: NextRequest) {
  const authToken    = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith('/dashboard');
  const isAuthPage  = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Check whether the access token is valid
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

  // CASE A: user tries to access the dashboard
  if (isDashboard) {
    // Valid token -> allow access without flicker
    if (isValidToken) return NextResponse.next();
    // No refresh token -> redirect to login
    if (!refreshToken) return NextResponse.redirect(new URL('/login', request.url));
    // There is a refresh token but the access token expired -> allow access,
    // fetchWithRefresh will renew it on the client
    return NextResponse.next();
  }

  // CASE B: user tries to access login/register with an active session
  if (isAuthPage && (isValidToken || refreshToken)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
