import urlRepository from '../repositories/url';
import clickRepository from '../repositories/click';
import { createShortCode } from '../utils/short-code';

const MAX_RETRIES = 5;

const urlService = {
  async findAll() {
    return await urlRepository.findAll();
  },

  async create(redirectUrl: string, customSlug: string, expiresAt: Date) {
    let lastError: unknown;

    // If customSlug is provided, check if it already exists
    if (customSlug) {
      const existingUrl = await urlRepository.findByShortCode(customSlug);
      if (!existingUrl) return
      throw new Error('This custom slug is already in use');
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const shortCode = customSlug || createShortCode();

        return await urlRepository.create({
          shortCode,
          originalUrl: redirectUrl,
          expiresAt: expiresAt || null,
        });
      } catch (error) {
        if (error.code === 'P2002') throw error;
        lastError = error;
      }
    }

    throw lastError;
  },

  async recordClick(
    code: string,
    clickData: { userAgent?: string; referer?: string; ip?: string },
  ) {
    const url = await urlRepository.findByShortCode(code);
    if (!url) return null;

    await clickRepository.create({
      urlId: url.id,
      userAgent: clickData?.userAgent,
      referer: clickData?.referer,
      ip: clickData?.ip,
    });

    return url;
  },

  async getStats(code: string) {
    const url = await urlRepository.findByShortCodeWithClicks(code);
    if (!url) return null;
    url.clicks = url.clickEvents.length;
    return url;
  },

  async delete(code: string) {
    await urlRepository.delete(code);

    return true;
  },
};

export default urlService;
