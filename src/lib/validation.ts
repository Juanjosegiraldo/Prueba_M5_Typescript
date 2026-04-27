// ============================================================
// VALIDACIONES ESTRICTAS con mensajes claros
// ============================================================

import type { CreateCasaDto, UpdateCasaDto } from '@/types/casa.types';
import { validateImageUpload } from '@/lib/image-upload';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// --- Validar CreateCasaDto ---
export function validateCreateCasa(body: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'El cuerpo de la petición es inválido' }] };
  }

  const data = body as Record<string, unknown>;

  // titulo: string, min 3, max 150
  if (!data.titulo || typeof data.titulo !== 'string') {
    errors.push({ field: 'titulo', message: 'El título es requerido y debe ser texto' });
  } else if (data.titulo.trim().length < 3) {
    errors.push({ field: 'titulo', message: 'El título debe tener mínimo 3 caracteres' });
  } else if (data.titulo.trim().length > 150) {
    errors.push({ field: 'titulo', message: 'El título no puede superar 150 caracteres' });
  }

  // descripcion: string, min 10, max 5000
  if (!data.descripcion || typeof data.descripcion !== 'string') {
    errors.push({ field: 'descripcion', message: 'La descripción es requerida y debe ser texto' });
  } else if (data.descripcion.trim().length < 10) {
    errors.push({ field: 'descripcion', message: 'La descripción debe tener mínimo 10 caracteres' });
  } else if (data.descripcion.trim().length > 5000) {
    errors.push({ field: 'descripcion', message: 'La descripción no puede superar 5000 caracteres' });
  }

  // precio: number positivo
  if (data.precio === undefined || data.precio === null) {
    errors.push({ field: 'precio', message: 'El precio es requerido' });
  } else if (typeof data.precio !== 'number' || isNaN(data.precio)) {
    errors.push({ field: 'precio', message: 'El precio debe ser un número válido' });
  } else if (data.precio <= 0) {
    errors.push({ field: 'precio', message: 'El precio debe ser mayor a 0' });
  } else if (data.precio > 999_999_999_999) {
    errors.push({ field: 'precio', message: 'El precio ingresado es demasiado alto' });
  }

  // imagenUrl: opcional, si viene debe ser string
  if (data.imagenUrl !== undefined && data.imagenUrl !== null && typeof data.imagenUrl !== 'string') {
    errors.push({ field: 'imagenUrl', message: 'La URL de imagen debe ser texto' });
  }

  return { valid: errors.length === 0, errors };
}

// --- Validar UpdateCasaDto ---
export function validateUpdateCasa(body: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'El cuerpo de la petición es inválido' }] };
  }

  const data = body as Record<string, unknown>;
  let hasAtLeastOneField = false;

  if (data.titulo !== undefined) {
    hasAtLeastOneField = true;
    if (typeof data.titulo !== 'string') {
      errors.push({ field: 'titulo', message: 'El título debe ser texto' });
    } else if (data.titulo.trim().length < 3) {
      errors.push({ field: 'titulo', message: 'El título debe tener mínimo 3 caracteres' });
    } else if (data.titulo.trim().length > 150) {
      errors.push({ field: 'titulo', message: 'El título no puede superar 150 caracteres' });
    }
  }

  if (data.descripcion !== undefined) {
    hasAtLeastOneField = true;
    if (typeof data.descripcion !== 'string') {
      errors.push({ field: 'descripcion', message: 'La descripción debe ser texto' });
    } else if (data.descripcion.trim().length < 10) {
      errors.push({ field: 'descripcion', message: 'La descripción debe tener mínimo 10 caracteres' });
    } else if (data.descripcion.trim().length > 5000) {
      errors.push({ field: 'descripcion', message: 'La descripción no puede superar 5000 caracteres' });
    }
  }

  if (data.precio !== undefined) {
    hasAtLeastOneField = true;
    if (typeof data.precio !== 'number' || isNaN(data.precio)) {
      errors.push({ field: 'precio', message: 'El precio debe ser un número válido' });
    } else if (data.precio <= 0) {
      errors.push({ field: 'precio', message: 'El precio debe ser mayor a 0' });
    } else if (data.precio > 999_999_999_999) {
      errors.push({ field: 'precio', message: 'El precio ingresado es demasiado alto' });
    }
  }

  if (data.imagenUrl !== undefined && data.imagenUrl !== null && typeof data.imagenUrl !== 'string') {
    errors.push({ field: 'imagenUrl', message: 'La URL de imagen debe ser texto' });
  }

  if (!hasAtLeastOneField && data.imagenUrl === undefined) {
    errors.push({ field: 'body', message: 'Debes enviar al menos un campo para actualizar' });
  }

  return { valid: errors.length === 0, errors };
}

// --- Sanitizar CreateCasaDto (eliminar campos extra) ---
export function sanitizeCreateCasa(body: Record<string, unknown>): CreateCasaDto {
  return {
    titulo: (body.titulo as string).trim(),
    descripcion: (body.descripcion as string).trim(),
    precio: body.precio as number,
    imagenUrl: body.imagenUrl ? (body.imagenUrl as string).trim() : null,
  };
}

// --- Sanitizar UpdateCasaDto (solo los campos que llegan) ---
export function sanitizeUpdateCasa(body: Record<string, unknown>): UpdateCasaDto {
  const result: UpdateCasaDto = {};
  if (body.titulo !== undefined) result.titulo = (body.titulo as string).trim();
  if (body.descripcion !== undefined) result.descripcion = (body.descripcion as string).trim();
  if (body.precio !== undefined) result.precio = body.precio as number;
  if (body.imagenUrl !== undefined) result.imagenUrl = body.imagenUrl as string | null;
  return result;
}

export function validateImageFile(file: File): FileValidationResult {
  return validateImageUpload(file);
}
