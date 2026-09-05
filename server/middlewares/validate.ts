import { BadRequestError } from '../errors';
import type { ZodType } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/**
 * Validates req.body against a schema and replaces it with the parsed result,
 * so controllers and services only ever see well-formed input.
 */
const validateBody =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const [issue] = result.error.issues;
      throw new BadRequestError(issue.message);
    }

    req.body = result.data;
    next();
  };

export { validateBody };
