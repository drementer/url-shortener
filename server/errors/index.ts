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

/** Which field failed and why, so a client can place the message on a form */
type FieldIssue = {
  path: string;
  message: string;
};

class BadRequestError extends AppError {
  details?: FieldIssue[];

  constructor(message = 'Bad request', details?: FieldIssue[]) {
    super(message, 400);
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

/**
 * The request declares a body in a format the API does not read. Every write
 * endpoint takes application/json and nothing else.
 */
class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Content-Type must be application/json') {
    super(message, 415);
  }
}

/** The client rules out the only media type the API produces */
class NotAcceptableError extends AppError {
  constructor(message = 'Only application/json can be produced') {
    super(message, 406);
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

export type { FieldIssue };
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  QuotaExceededError,
  NotFoundError,
  NotAcceptableError,
  UnsupportedMediaTypeError,
  ConflictError,
  UniqueConstraintError,
};
