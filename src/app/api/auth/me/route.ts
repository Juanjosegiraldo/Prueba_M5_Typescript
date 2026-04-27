import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';
import type { JwtPayload } from '@/types/auth.types';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return errorResponse('No active session', 401);

    const secret = process.env.JWT_SECRET || 'secret_de_respaldo';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) return errorResponse('User not found', 404);

    return successResponse({ user }, 'Session active');
  } catch (error) {
    console.error('[GET /api/auth/me]', error);
    return errorResponse('Invalid or expired token', 401);
  }
}
