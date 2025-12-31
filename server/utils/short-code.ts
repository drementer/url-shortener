import { nanoid } from 'nanoid';

const CODE_LENGTH = 6;

/**
 * Generates a random short code for URL shortening
 * @returns A random 6-character alphanumeric string
 */
const createShortCode = (): string => {
  return nanoid(CODE_LENGTH);
};

export { createShortCode };