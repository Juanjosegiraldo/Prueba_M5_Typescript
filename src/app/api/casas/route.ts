import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { validateCreateCasa, sanitizeCreateCasa } from '@/lib/validation';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/response';
import type { CasaResponseDto } from '@/types/casa.types';

// ============================================================
// GET /api/casas — List houses with pagination, search & sort
// Query params: search, page, limit, sort, order
// ============================================================
export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse('Unauthorized', 401);

  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const sort   = searchParams.get('sort')  || 'createdAt';
    const order  = searchParams.get('order') || 'desc';

    // --- Pagination ---
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '9', 10)));
    const skip  = (page - 1) * limit;

    // Whitelist sort fields to prevent injection
    const safeSort  = ['createdAt', 'precio', 'titulo'].includes(sort) ? sort : 'createdAt';
    const safeOrder = order === 'asc' ? 'asc' : 'desc';

    const where = search
      ? {
          OR: [
            { titulo:      { contains: search, mode: 'insensitive' as const } },
            { descripcion: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    // Run count + data in parallel for efficiency
    const [total, casas] = await Promise.all([
      prisma.casa.count({ where }),
      prisma.casa.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { [safeSort]: safeOrder },
        skip,
        take: limit,
      }),
    ]);

    const data: CasaResponseDto[] = casas.map((c) => ({
      id:          c.id,
      titulo:      c.titulo,
      descripcion: c.descripcion,
      precio:      c.precio,
      imagenUrl:   c.imagenUrl,
      userId:      c.userId,
      agente:      c.user.name,
      createdAt:   c.createdAt.toISOString(),
    }));

    return successResponse(
      {
        casas: data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
      'Houses retrieved successfully'
    );
  } catch (error) {
    console.error('[GET /api/casas]', error);
    return errorResponse('Internal server error', 500);
  }
}

// ============================================================
// POST /api/casas — Create a new house (authenticated)
// ============================================================
export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse('Unauthorized', 401);

  try {
    const body = await request.json();

    const { valid, errors } = validateCreateCasa(body);
    if (!valid) return validationErrorResponse(errors);

    const dto = sanitizeCreateCasa(body);

    const casa = await prisma.casa.create({
      data: {
        titulo:      dto.titulo,
        descripcion: dto.descripcion,
        precio:      dto.precio,
        imagenUrl:   dto.imagenUrl ?? null,
        userId:      user.id,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

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

    return successResponse(data, 'House created successfully', 201);
  } catch (error) {
    console.error('[POST /api/casas]', error);
    return errorResponse('Internal server error', 500);
  }
}
