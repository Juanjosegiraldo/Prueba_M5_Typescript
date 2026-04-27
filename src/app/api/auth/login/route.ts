import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '@/lib/response';
import type { LoginDto } from '@/types/auth.types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password }: LoginDto = body;

    if (!email || typeof email !== 'string')
      return errorResponse('Email is required', 400);
    if (!password || typeof password !== 'string')
      return errorResponse('Password is required', 400);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return errorResponse('Invalid credentials', 401);

    const secret = process.env.JWT_SECRET || 'secret_de_respaldo';

    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      secret,
      { expiresIn: '15m' }
    );

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshTokenValue, userId: user.id, expiresAt },
    });

    const { password: _pw, ...userWithoutPassword } = user;

    const response = NextResponse.json(
      { success: true, data: { user: userWithoutPassword }, message: 'Login successful' },
      { status: 200 }
    );

    response.cookies.set({ name: 'auth_token',     value: accessToken,       httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 15 * 60 });
    response.cookies.set({ name: 'refresh_token',  value: refreshTokenValue, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });

    return response;
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return errorResponse('Internal server error', 500);
  }
}
