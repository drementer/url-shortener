import { NotAcceptableError, UnsupportedMediaTypeError } from '../../domain/errors';
import type { Request, Response, NextFunction } from 'express';

const MEDIA_TYPE = 'application/json';

/**
 * express.json() parses a body only when it is sent as JSON and skips any other
 * type without a word, so a mislabelled body would reach a validator as an
 * empty object and be reported as a missing field. A request that announces no
 * body at all is left alone: its own handler answers it, and demanding a
 * Content-Type from a request that carries nothing would say nothing useful.
 */
const hasBody = (req: Request) =>
  req.headers['transfer-encoding'] !== undefined ||
  Number(req.headers['content-length']) > 0;

/**
 * The API speaks JSON and nothing else: it reads only a JSON body and has no
 * second representation to offer, so no response ever varies by Accept and
 * none of them carries Vary: Accept.
 */
const jsonOnly = (req: Request, res: Response, next: NextFunction) => {
  if (hasBody(req) && !req.is(MEDIA_TYPE)) {
    throw new UnsupportedMediaTypeError();
  }

  // A missing Accept header means anything goes, which req.accepts honours
  if (!req.accepts(MEDIA_TYPE)) {
    throw new NotAcceptableError();
  }

  next();
};

export default jsonOnly;
