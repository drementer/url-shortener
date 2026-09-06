import { describe, expect, it } from 'bun:test';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '../errors';

// The error handler answers with statusCode and message, nothing else
const cases = [
  { Error: BadRequestError, status: 400, fallback: 'Bad request' },
  {
    Error: UnauthorizedError,
    status: 401,
    fallback: 'Authentication required',
  },
  { Error: NotFoundError, status: 404, fallback: 'Not found' },
  { Error: ConflictError, status: 409, fallback: 'Conflict' },
];

describe('domain errors', () => {
  it.each(cases)(
    '$Error.name carries status $status and its own message',
    ({ Error: DomainError, status }) => {
      const error = new DomainError('something specific');

      expect(error.statusCode).toBe(status);
      expect(error.message).toBe('something specific');
    },
  );

  it.each(cases)(
    '$Error.name falls back to a generic message',
    ({ Error: DomainError, fallback }) => {
      expect(new DomainError().message).toBe(fallback);
    },
  );

  it.each(cases)(
    '$Error.name is recognisable as an AppError',
    ({ Error: DomainError }) => {
      const error = new DomainError();

      // The error handler branches on this, anything else becomes a 500
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(DomainError.name);
    },
  );

  it('keeps a stack trace', () => {
    expect(new NotFoundError().stack).toBeString();
  });
});
