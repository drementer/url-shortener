import { describe, expect, it, mock } from 'bun:test';
import { z } from 'zod';
import { validateBody } from '../middlewares/validate';
import { BadRequestError } from '../errors';
import type { Request, Response, NextFunction } from 'express';

const schema = z.object({
  name: z.string('A name is required').min(2, 'Name is too short'),
  age: z.number().optional(),
});

const run = (body: unknown) => {
  const req = { body } as Request;
  const next = mock<NextFunction>(() => {});

  validateBody(schema)(req, {} as Response, next);

  return { req, next };
};

describe('validateBody', () => {
  it('hands a valid body on', () => {
    const { req, next } = run({ name: 'ok' });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ name: 'ok' });
  });

  it('replaces the body with the parsed result', () => {
    // Controllers only ever see the parsed shape, never the raw request
    const { req } = run({ name: 'ok', role: 'admin' });

    expect(req.body).not.toHaveProperty('role');
  });

  it('answers with the first issue of a rejected body', () => {
    expect(() => run({ name: 'a' })).toThrow(BadRequestError);
    expect(() => run({ name: 'a' })).toThrow('Name is too short');
    expect(() => run({})).toThrow('A name is required');
  });

  it('does not hand a rejected body on', () => {
    const req = { body: { name: 'a' } } as Request;
    const next = mock<NextFunction>(() => {});

    expect(() =>
      validateBody(schema)(req, {} as Response, next),
    ).toThrow(BadRequestError);
    expect(next).not.toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'a' });
  });

  it('rejects a body that is not an object', () => {
    expect(() => run(undefined)).toThrow(BadRequestError);
    expect(() => run('a string body')).toThrow(BadRequestError);
  });
});
