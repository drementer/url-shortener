/**
 * Domain errors carrying the HTTP status the error handler should answer with.
 * Anything thrown that is not an AppError is treated as an unexpected failure.
 */
class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

/**
 * A uniqueness rule of the storage was violated. Repositories raise it in place
 * of the driver's own error, so a use case can react to a collision without
 * knowing which database reported it or how.
 */
class UniqueConstraintError extends ConflictError {
  constructor(message = 'Already exists') {
    super(message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class QuotaExceededError extends ForbiddenError {
  constructor(message = 'Active link quota exceeded') {
    super(message);
  }
}

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  QuotaExceededError,
  NotFoundError,
  ConflictError,
  UniqueConstraintError,
};
