import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    const response = NextResponse.json(
      { success: true, data: null, message: 'Session closed successfully' },
      { status: 200 }
    );
    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');
    return response;
  } catch (error) {
    console.error('[POST /api/auth/logout]', error);
    return errorResponse('Internal server error', 500);
  }
}
