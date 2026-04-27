import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/response';
import { getImageExtension, validateImageUpload } from '@/lib/image-upload';
import { v4 as uuidv4 } from 'uuid';
import type { UploadResponseDto } from '@/types/casa.types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return errorResponse('Unauthorized', 401);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return errorResponse('No file received', 400);

    const validation = validateImageUpload(file);
    if (!validation.valid) return errorResponse(validation.error || 'Invalid image', 422);

    const ext = getImageExtension(file.name);

    // Unique filename to avoid collisions
    const uniqueName = `casa-${uuidv4()}.${ext}`;

    // Upload to the "casas" Supabase Storage bucket
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from('casas')
      .upload(uniqueName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[upload] Supabase error:', error);
      return errorResponse('Error uploading to storage', 500);
    }

    // Get the public URL
    const { data: publicData } = supabase.storage
      .from('casas')
      .getPublicUrl(uniqueName);

    const data: UploadResponseDto = {
      url:      publicData.publicUrl,
      filename: uniqueName,
      size:     file.size,
    };

    return successResponse(data, 'Image uploaded successfully', 201);

  } catch (error) {
    console.error('[POST /api/upload]', error);
    return errorResponse('Error processing file', 500);
  }
}
