import { ErrorHandler } from 'hono';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') || 'unknown';

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          requestId,
        },
      },
      err.status as any
    );
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu đầu vào không hợp lệ',
          details: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
          requestId,
        },
      },
      400
    );
  }

  // Postgres errors
  if ((err as any)?.code === '23505') {
    // Unique violation
    return c.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'Dữ liệu đã tồn tại trong hệ thống',
          requestId,
        },
      },
      409
    );
  }

  console.error(`[API Error ${requestId}]:`, err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.',
        requestId,
      },
    },
    500
  );
};
