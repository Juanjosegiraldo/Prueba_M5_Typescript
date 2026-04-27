// ============================================================
// Standard API response wrapper
// Success: { success: true, data: {...}, message: "" }
// Error:   { success: false, error: "", statusCode: 400 }
// ============================================================

import { NextResponse } from 'next/server';

export function successResponse<T>(data: T, message = '', status = 200) {
  return NextResponse.json(
    { success: true, data, message },
    { status }
  );
}

export function errorResponse(error: string, statusCode: number) {
  return NextResponse.json(
    { success: false, error, statusCode },
    { status: statusCode }
  );
}

export function validationErrorResponse(errors: { field: string; message: string }[]) {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      statusCode: 422,
      errors,
    },
    { status: 422 }
  );
}
