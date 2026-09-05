import { AppError } from '../errors';
import type { Request, Response, NextFunction } from 'express';

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

  // Unexpected failures are logged in full but never described to the client
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};

export { notFoundHandler, errorHandler };
