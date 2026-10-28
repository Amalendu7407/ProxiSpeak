import { z } from 'zod';
import { config } from '../config/index.js';

export function isDomainAllowed(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1].toLowerCase();
  return domain === config.allowedEmailDomain.toLowerCase();
}

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters'),
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .toLowerCase()
      .refine(
        (email) => isDomainAllowed(email),
        {
          message: `Registration is restricted to the @${config.allowedEmailDomain} domain`,
        }
      ),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .regex(/[0-9]|[^a-zA-Z0-9]/, 'Password must contain at least one number or special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
});
