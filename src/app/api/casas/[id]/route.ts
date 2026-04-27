import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, canModify } from '@/lib/auth';
import { validateUpdateCasa, sanitizeUpdateCasa } from '@/lib/validation';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/response';
import type { CasaResponseDto } from '@/types/casa.types';
import path from 'path';
import fs from 'fs';

type Params = { params: Promise<{ id: string }> };

// ============================================================
// GET /api/casas/[id] — Get a single house by ID
// ============================================================
export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return errorResponse('Unauthorized', 401);

  const { id } = await params;
  if (!id || typeof id !== 'string') return errorResponse('Invalid ID', 400);

  try {
    const casa = await prisma.casa.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    if (!casa) return errorResponse('House not found', 404);

    const data: CasaResponseDto = {
      id:          casa.id,
      titulo:      casa.titulo,
      descripcion: casa.descripcion,
      precio:      casa.precio,
      imagenUrl:   casa.imagenUrl,
      userId:      casa.userId,
      agente:      casa.user.name,
      createdAt:   casa.createdAt.toISOString(),
    };

    return successResponse(data, 'House retrieved successfully');
  } catch (error) {
    console.error('[GET /api/casas/[id]]', error);
    return errorResponse('Internal server error', 500);
  }
}

// ============================================================
// PUT /api/casas/[id] — Update a house (owner or ADMIN)
// ============================================================
export async function PUT(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return errorResponse('Unauthorized', 401);

  const { id } = await params;

  try {
    const existing = await prisma.casa.findUnique({ where: { id } });
    if (!existing) return errorResponse('House not found', 404);

    if (!canModify(user, existing.userId)) {
      return errorResponse('You do not have permission to edit this house', 403);
    }

    const body = await request.json();

    const { valid, errors } = validateUpdateCasa(body);
    if (!valid) return validationErrorResponse(errors);

    const dto = sanitizeUpdateCasa(body);

    const updated = await prisma.casa.update({
      where: { id },
      data: dto,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    const data: CasaResponseDto = {
      id:          updated.id,
      titulo:      updated.titulo,
      descripcion: updated.descripcion,
      precio:      updated.precio,
      imagenUrl:   updated.imagenUrl,
      userId:      updated.userId,
      agente:      updated.user.name,
      createdAt:   updated.createdAt.toISOString(),
    };

    return successResponse(data, 'House updated successfully');
  } catch (error) {
    console.error('[PUT /api/casas/[id]]', error);
    return errorResponse('Internal server error', 500);
  }
}

// ============================================================
// DELETE /api/casas/[id] — Delete a house (owner or ADMIN)
// ============================================================
export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return errorResponse('Unauthorized', 401);

  const { id } = await params;

  try {
    const existing = await prisma.casa.findUnique({ where: { id } });
    if (!existing) return errorResponse('House not found', 404);

    if (!canModify(user, existing.userId)) {
      return errorResponse('You do not have permission to delete this house', 403);
    }

    // Remove local image file if it exists
    if (existing.imagenUrl?.startsWith('/uploads/')) {
      const filename = existing.imagenUrl.replace('/uploads/', '');
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }

    await prisma.casa.delete({ where: { id } });

    return successResponse(null, 'House deleted successfully');
  } catch (error) {
    console.error('[DELETE /api/casas/[id]]', error);
    return errorResponse('Internal server error', 500);
  }
}
