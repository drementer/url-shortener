import urlRepository from '../repositories/url';
import clickRepository from '../repositories/click';
import { createShortCode } from '../utils/short-code';
import { ConflictError } from '../errors';

const MAX_RETRIES = 5;
const SLUG_TAKEN = 'This custom slug is already in use';

/** Prisma reports a violated unique constraint, i.e. a taken short code, as P2002 */
const isCollisionError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';

const isExpired = (expiresAt: Date | null) =>
  !!expiresAt && expiresAt < new Date();

const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * Turns a lifetime in hours into an absolute date, or null for no expiry.
 * Counts elapsed time rather than calendar hours, so a link outlives a daylight
 * saving transition by exactly the requested duration.
 */
const resolveExpiry = (expiresIn?: number) => {
  if (!expiresIn) return null;

  return new Date(Date.now() + expiresIn * HOUR_IN_MS);
};

type CreateUrlCommand = {
  url: string;
  customSlug?: string;
  expiresIn?: number;
};

type ClickData = { userAgent?: string; referer?: string; ip?: string };

const urlService = {
  async findAll(userId: string) {
    return await urlRepository.findAllByUser(userId);
  },

  // Input shape is guaranteed by createUrlSchema at the route level
  async create(
    { url, customSlug, expiresIn }: CreateUrlCommand,
    userId: string,
  ) {
    const expiresAt = resolveExpiry(expiresIn);

    // Early check so a taken slug fails before hitting the unique constraint
    if (customSlug) {
      const existingUrl = await urlRepository.findByShortCode(customSlug);
      if (existingUrl) throw new ConflictError(SLUG_TAKEN);
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await urlRepository.create({
          shortCode: customSlug || createShortCode(),
          // Kept alongside shortCode to record that the user picked this code
          customSlug: customSlug ?? null,
          originalUrl: url,
          expiresAt,
          userId,
        });
      } catch (error) {
        if (!isCollisionError(error)) throw error;
        // Retrying a custom slug is pointless, it would reuse the same value
        if (customSlug) throw new ConflictError(SLUG_TAKEN);
      }
    }

    throw new Error('Could not generate a unique short code');
  },

  /**
   * Resolves a short code for redirecting. The click is only recorded for a
   * live link, so hits on an expired one never reach the statistics.
   */
  async resolveRedirect(code: string, clickData: ClickData) {
    const url = await urlRepository.findByShortCode(code);
    if (!url) return { status: 'not_found' as const, url: null };

    if (isExpired(url.expiresAt)) return { status: 'expired' as const, url };

    await clickRepository.create({
      urlId: url.id,
      userAgent: clickData?.userAgent,
      referer: clickData?.referer,
      ip: clickData?.ip,
    });

    return { status: 'active' as const, url };
  },

  /**
   * Both of these answer as if the link did not exist when it belongs to
   * someone else, so no one can probe which short codes are taken.
   */
  async getStats(code: string, userId: string) {
    return await urlRepository.findOwnedWithClicks(code, userId);
  },

  async delete(code: string, userId: string) {
    const deletedCount = await urlRepository.deleteOwned(code, userId);

    return deletedCount > 0;
  },
};

export default urlService;
export type { CreateUrlCommand };
