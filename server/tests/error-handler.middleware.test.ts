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

  it('leaves a response already on its way to Express', () => {
    // A redirect may have been sent, so the connection is no longer ours
    const error = new NotFoundError();
    const { sent, next } = run(error, true);

    expect(sent.status).toBe(200);
    expect(next).toHaveBeenCalledWith(error);
  });
});
