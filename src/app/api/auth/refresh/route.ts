import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { errorResponse } from '@/lib/response';

export async function POST(request: NextRequest) {
  try {
    const refreshTokenValue = request.cookies.get('refresh_token')?.value;
    if (!refreshTokenValue) return errorResponse('No refresh token provided', 401);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!stored || stored.expiresAt < new Date())
      return errorResponse('Invalid or expired refresh token', 401);

    const secret = process.env.JWT_SECRET || 'secret_de_respaldo';
    const newAccessToken = jwt.sign(
      { id: stored.user.id, role: stored.user.role, email: stored.user.email },
      secret,
      { expiresIn: '15m' }
    );

    const response = NextResponse.json(
      { success: true, data: null, message: 'Token refreshed successfully' },
      { status: 200 }
    );
    response.cookies.set({ name: 'auth_token', value: newAccessToken, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60 });

    return response;
  } catch (error) {
    console.error('[POST /api/auth/refresh]', error);
    return errorResponse('Internal server error', 500);
  }
}
