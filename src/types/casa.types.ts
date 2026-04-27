// ============================================================
// INTERFACES: Formas de los datos que vienen de la BD
// ============================================================

export interface CasaUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Casa {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  imagenUrl: string | null;
  userId: string;
  user: CasaUser;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// DTOs: Formas de los datos que viajan en requests/responses
// ============================================================

/** DTO para CREAR una casa — todos los campos requeridos excepto imagen */
export interface CreateCasaDto {
  titulo: string;
  descripcion: string;
  precio: number;
  imagenUrl?: string | null;
}

/** DTO para ACTUALIZAR una casa — todos los campos opcionales */
export interface UpdateCasaDto {
  titulo?: string;
  descripcion?: string;
  precio?: number;
  imagenUrl?: string | null;
}

/** DTO de respuesta al listar/obtener una casa */
export interface CasaResponseDto {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
  imagenUrl: string | null;
  userId: string;
  agente: string;       // nombre del agente
  createdAt: string;
}

/** DTO de respuesta al subir imagen */
export interface UploadResponseDto {
  url: string;
  filename: string;
  size: number;
}

// ============================================================
// TIPOS AUXILIARES
// ============================================================

export type CasaSortField = 'createdAt' | 'precio' | 'titulo';
export type SortOrder = 'asc' | 'desc';

export interface CasaFilters {
  search?: string;
  sort?: CasaSortField;
  order?: SortOrder;
}
