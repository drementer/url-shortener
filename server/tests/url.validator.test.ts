import { describe, expect, it } from 'bun:test';
import { createUrlSchema } from '../validators/url';

const URL = 'https://example.com';

/** validateBody answers with the first issue, so that is what is asserted */
const firstIssue = (input: unknown) =>
  createUrlSchema.safeParse(input).error?.issues[0]?.message;

describe('createUrlSchema', () => {
  it('accepts a bare URL', () => {
    const result = createUrlSchema.safeParse({ url: URL });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ url: URL });
  });

  it('rejects anything that is not a URL', () => {
    expect(firstIssue({ url: 'not-a-url' })).toBe('A valid URL is required');
    expect(firstIssue({})).toBe('A valid URL is required');
  });
});

describe('createUrlSchema custom slug', () => {
  it('keeps a valid slug, trimmed', () => {
    const { data } = createUrlSchema.safeParse({
      url: URL,
      customSlug: '  my_slug-1  ',
    });

    expect(data?.customSlug).toBe('my_slug-1');
  });

  it('reads an empty field as no slug at all', () => {
    // The form submits an untouched input as '', which is not a rejection
    const result = createUrlSchema.safeParse({ url: URL, customSlug: '' });

    expect(result.success).toBe(true);
    expect(result.data?.customSlug).toBeUndefined();
  });

  it('rejects a slug outside the length bounds', () => {
    expect(firstIssue({ url: URL, customSlug: 'ab' })).toBe(
      'Custom slug must be at least 3 characters',
    );
    expect(firstIssue({ url: URL, customSlug: 'a'.repeat(33) })).toBe(
      'Custom slug must be at most 32 characters',
    );
  });

  it('rejects characters that would have to be escaped in a URL', () => {
    const message = 'Custom slug may only contain letters, numbers, - and _';

    expect(firstIssue({ url: URL, customSlug: 'my slug' })).toBe(message);
    expect(firstIssue({ url: URL, customSlug: 'my/slug' })).toBe(message);
    expect(firstIssue({ url: URL, customSlug: 'slug?' })).toBe(message);
  });

  it('rejects a reserved slug whatever the casing', () => {
    // These would shadow a real route, so they cannot be handed out
    const message = 'This custom slug is reserved';

    expect(firstIssue({ url: URL, customSlug: 'api' })).toBe(message);
    expect(firstIssue({ url: URL, customSlug: 'API' })).toBe(message);
    expect(firstIssue({ url: URL, customSlug: 'Expired' })).toBe(message);
    expect(firstIssue({ url: URL, customSlug: 'stats' })).toBe(message);
    expect(firstIssue({ url: URL, customSlug: '404' })).toBe(message);
  });
});

describe('createUrlSchema expiry', () => {
  it('accepts a whole number of hours', () => {
    const { data } = createUrlSchema.safeParse({ url: URL, expiresIn: 24 });

    expect(data?.expiresIn).toBe(24);
  });

  it('rejects a value that is not a whole positive number of hours', () => {
    expect(firstIssue({ url: URL, expiresIn: '24' })).toBe(
      'expiresIn must be a number of hours',
    );
    expect(firstIssue({ url: URL, expiresIn: 1.5 })).toBe(
      'expiresIn must be a whole number of hours',
    );
    expect(firstIssue({ url: URL, expiresIn: 0 })).toBe(
      'expiresIn must be greater than zero',
    );
    expect(firstIssue({ url: URL, expiresIn: -3 })).toBe(
      'expiresIn must be greater than zero',
    );
  });

  it('rejects a lifetime beyond a year', () => {
    expect(firstIssue({ url: URL, expiresIn: 24 * 365 + 1 })).toBe(
      'expiresIn may not exceed one year',
    );
    expect(
      createUrlSchema.safeParse({ url: URL, expiresIn: 24 * 365 }).success,
    ).toBe(true);
  });

  it('drops fields the schema does not know about', () => {
    const { data } = createUrlSchema.safeParse({ url: URL, userId: 'someone' });

    expect(data).not.toHaveProperty('userId');
  });
});
