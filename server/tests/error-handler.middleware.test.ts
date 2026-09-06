import { describe, expect, it, mock, spyOn } from 'bun:test';
import { notFoundHandler, errorHandler } from '../middlewares/error-handler';
import { ConflictError, NotFoundError } from '../errors';
import type { Request, Response, NextFunction } from 'express';

/** Records what the handler answered with, so nothing real has to be served */
const recorder = (headersSent = false) => {
  const sent = { status: 200, body: undefined as unknown };
  const res = {
    headersSent,
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: unknown) {
      sent.body = body;
      return this;
    },
  } as unknown as Response;

  return { res, sent };
};

describe('notFoundHandler', () => {
  it('answers 404 as JSON', () => {
    const { res, sent } = recorder();

    notFoundHandler({} as Request, res);

    expect(sent.status).toBe(404);
    expect(sent.body).toEqual({ error: 'Endpoint not found' });
  });
});

describe('errorHandler', () => {
  const run = (error: unknown, headersSent = false) => {
    const { res, sent } = recorder(headersSent);
    const next = mock<NextFunction>(() => {});

    errorHandler(error, {} as Request, res, next);

    return { sent, next };
  };

  it('answers a domain error with its own status and message', () => {
    const { sent, next } = run(new ConflictError('This slug is taken'));

    expect(sent.status).toBe(409);
    expect(sent.body).toEqual({ error: 'This slug is taken' });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers each domain error with the status it carries', () => {
    expect(run(new NotFoundError('URL not found')).sent).toEqual({
      status: 404,
      body: { error: 'URL not found' },
    });
  });

  it('never describes an unexpected failure to the client', () => {
    const log = spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { sent } = run(new Error('connect ECONNREFUSED 10.0.0.5:5432'));

      expect(sent.status).toBe(500);
      expect(sent.body).toEqual({ error: 'Internal server error' });
      // Still logged in full, the client just does not get to read it
      expect(log).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });

  it('treats anything else that was thrown as unexpected', () => {
    const log = spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(run('a bare string').sent.status).toBe(500);
      expect(run(null).sent.status).toBe(500);
    } finally {
      log.mockRestore();
    }
  });

  it('answers a rejected body with the status body-parser gave it', () => {
    const log = spyOn(console, 'error').mockImplementation(() => {});

    try {
      // What express.json() throws: an http-errors object, not an AppError
      const malformed = Object.assign(new SyntaxError('Unexpected token n'), {
        status: 400,
        statusCode: 400,
        expose: true,
        type: 'entity.parse.failed',
      });
      const oversized = Object.assign(new Error('request entity too large'), {
        status: 413,
        statusCode: 413,
        expose: true,
        type: 'entity.too.large',
      });

      expect(run(malformed).sent).toEqual({
        status: 400,
        body: { error: 'Invalid JSON body' },
      });
      expect(run(oversized).sent).toEqual({
        status: 413,
        body: { error: 'Request body is too large' },
      });
      // A client sending nonsense is not a failure worth logging
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('does not read a status off an error that hides its details', () => {
    const log = spyOn(console, 'error').mockImplementation(() => {});

    try {
      // expose is false for a 5xx, and any other status stays our problem
      const internal = Object.assign(new Error('boom'), {
        status: 500,
        expose: false,
      });
      const unmapped = Object.assign(new Error('teapot'), {
        status: 418,
        expose: true,
      });

      expect(run(internal).sent.status).toBe(500);
      expect(run(unmapped).sent.status).toBe(500);
    } finally {
      log.mockRestore();
    }
  });

  it('leaves a response already on its way to Express', () => {
    // A redirect may have been sent, so the connection is no longer ours
    const error = new NotFoundError();
    const { sent, next } = run(error, true);

    expect(sent.status).toBe(200);
    expect(next).toHaveBeenCalledWith(error);
  });
});
