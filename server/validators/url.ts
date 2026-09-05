import { z } from 'zod';
import type { CreateUrlCommand } from '../services/url';

const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/;
const RESERVED_SLUGS = ['api', '404', 'expired', 'stats'];
const MAX_EXPIRY_HOURS = 24 * 365;

const customSlugSchema = z
  .string()
  .trim()
  .min(3, 'Custom slug must be at least 3 characters')
  .max(32, 'Custom slug must be at most 32 characters')
  .regex(SLUG_PATTERN, 'Custom slug may only contain letters, numbers, - and _')
  .refine(
    (slug) => !RESERVED_SLUGS.includes(slug.toLowerCase()),
    'This custom slug is reserved',
  );

// Annotated with the service command so the two shapes cannot drift apart
const createUrlSchema: z.ZodType<CreateUrlCommand> = z.object({
  url: z.url('A valid URL is required'),
  // The form submits an empty field as '', which means "no slug given"
  customSlug: z.preprocess(
    (value) => (value === '' ? undefined : value),
    customSlugSchema.optional(),
  ),
  expiresIn: z
    .number('expiresIn must be a number of hours')
    .int('expiresIn must be a whole number of hours')
    .positive('expiresIn must be greater than zero')
    .max(MAX_EXPIRY_HOURS, 'expiresIn may not exceed one year')
    .optional(),
});

export { createUrlSchema };
