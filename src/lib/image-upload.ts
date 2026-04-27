export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function getImageExtension(filename: string) {
  return filename.toLowerCase().split('.').pop() || '';
}

export function getMimeTypeFromExtension(filename: string) {
  return MIME_TYPE_BY_EXTENSION[getImageExtension(filename)] ?? null;
}

export function validateImageUpload(file: { name: string; size: number; type: string }): FileValidationResult {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Formato no permitido: ${file.type}. Usa JPG, PNG o WEBP`,
    };
  }

  const ext = getImageExtension(file.name);
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: `Extension no permitida: .${ext}. Usa .jpg, .png o .webp`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `La imagen pesa ${sizeMB}MB. El maximo permitido es ${MAX_IMAGE_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}
