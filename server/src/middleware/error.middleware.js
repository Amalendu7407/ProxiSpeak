import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export function errorHandler(err, req, res, next) {
  logger.error('API Error', {
    message: err.message,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
  });

  // Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: formattedErrors[0]?.message || 'Invalid request data',
        details: formattedErrors,
      },
    });
  }

  // MongoDB Unique Index Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `An entry with this ${field} already exists`,
      },
    });
  }

  // Explicit status code error
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && config.isProduction ? 'Internal Server Error' : err.message;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: message || 'An unexpected error occurred',
    },
  });
}
