import { describe, expect, it } from 'bun:test';
import { createShortCode } from '../utils/short-code';

describe('createShortCode', () => {
  it('returns six characters from the URL safe alphabet', () => {
    const code = createShortCode();

    expect(code).toHaveLength(6);
    // Anything outside this set would have to be escaped in a URL
    expect(code).toMatch(/^[A-Za-z0-9_-]{6}$/);
  });

  it('does not repeat itself across a batch of calls', () => {
    const codes = new Set(
      Array.from({ length: 500 }, () => createShortCode()),
    );

    expect(codes.size).toBe(500);
  });
});
