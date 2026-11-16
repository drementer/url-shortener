import { z } from 'zod';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Query strings arrive as text, so pagination bounds and date filters are
 * coerced before being passed to the repository.
 */
const listAuditLogsQuerySchema = z
  .object({
    page: z.coerce
      .number('page must be a number')
      .int('page must be a whole number')
      .positive('page must be greater than zero')
      .default(1),
    limit: z.coerce
      .number('limit must be a number')
      .int('limit must be a whole number')
      .positive('limit must be greater than zero')
      .max(MAX_PAGE_SIZE, `limit may not exceed ${MAX_PAGE_SIZE}`)
      .default(DEFAULT_PAGE_SIZE),
    action: z.string().trim().min(1, 'action must not be empty').optional(),
    actorId: z.string().trim().min(1, 'actorId must not be empty').optional(),
    from: z.coerce.date('from must be a valid date').optional(),
    to: z.coerce.date('to must be a valid date').optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: 'from must not be after to',
  });

type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

export { listAuditLogsQuerySchema };
export type { ListAuditLogsQuery };
