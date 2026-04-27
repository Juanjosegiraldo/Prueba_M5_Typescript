import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '@/lib/response';
import type { RegisterDto } from '@/types/auth.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password }: RegisterDto = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2)
      return errorResponse('Name must be at least 2 characters', 400);
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return errorResponse('Invalid email address', 400);
    if (!password || typeof password !== 'string' || password.length < 6)
      return errorResponse('Password must be at least 6 characters', 400);

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return errorResponse('Email is already registered', 400);

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase(), password: hashed, role: 'AGENT' },
    });

    return successResponse({ id: newUser.id }, 'User registered successfully', 201);
  } catch (error) {
    console.error('[POST /api/auth/register]', error);
    return errorResponse('Internal server error', 500);
  }
}
