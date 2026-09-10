import { BadRequestError } from '../errors';
import type { ZodType } from 'zod';
import type { FieldIssue } from '../errors';
import type { Request, Response, NextFunction } from 'express';

/**
 * A schema level check, such as "at least one field must be provided", carries
 * no path and belongs to the body rather than to a field, so it is left out of
 * details. The top level error still reports it.
 */
const toFieldIssues = (
  issues: readonly { path: PropertyKey[]; message: string }[],
): FieldIssue[] =>
  issues
    .filter((issue) => issue.path.length > 0)
    .map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));

/**
 * Parses a value against a schema or rejects the request with every issue the
 * schema found, so a client can place each message on the field it belongs to.
 * The top-level message stays the first issue, which is what a client showing a
 * single error already reads.
 */
const parseOrThrow = <T>(schema: ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);

  if (!result.success) {
    const [first] = result.error.issues;
    const details = toFieldIssues(result.error.issues);

    throw new BadRequestError(
      first!.message,
      details.length > 0 ? details : undefined,
    );
  }

  return result.data;
};

/**
 * Validates req.body against a schema and replaces it with the parsed result,
 * so controllers and services only ever see well-formed input.
 */
const validateBody =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    req.body = parseOrThrow(schema, req.body);
    next();
  };

/**
 * The query counterpart of validateBody. Express 5 exposes req.query through a
 * getter with no setter, so the parsed result is parked on res.locals instead
 * of replacing the original.
 */
const validateQuery =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    res.locals.query = parseOrThrow(schema, req.query);
    next();
  };

export { validateBody, validateQuery, parseOrThrow };
