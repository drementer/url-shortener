import { AppError } from '../errors';
import type { Request, Response, NextFunction } from 'express';

/**
 * body-parser rejects a malformed or oversized body with an http-errors object
 * rather than an AppError, so without this it would be answered as a failure of
 * ours. Only the status is taken from it: its message describes our parser.
 */
const BODY_ERRORS: Record<number, string> = {
  400: 'Invalid JSON body',
  413: 'Request body is too large',
};

const bodyErrorStatus = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return null;

  const { status, expose } = error as { status?: unknown; expose?: unknown };
  // expose marks an error body-parser considers safe to report back
  if (expose !== true || typeof status !== 'number') return null;

  return status in BODY_ERRORS ? status : null;
};

const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
};

const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // A redirect may already have been sent, let Express close the connection
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  const bodyStatus = bodyErrorStatus(error);
  if (bodyStatus) {
    res.status(bodyStatus).json({ error: BODY_ERRORS[bodyStatus] });
    return;
  }

  // Unexpected failures are logged in full but never described to the client
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};

export { notFoundHandler, errorHandler };
