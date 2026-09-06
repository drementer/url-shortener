import urlRepository from '../../repositories/url';
import clickRepository from '../../repositories/click';
import { isExpired } from '../../domain/url';

type ClickData = { userAgent?: string; referer?: string; ip?: string };

/**
 * Resolves a short code for redirecting. The click is only recorded for a live
 * link, so hits on an expired one never reach the statistics. Ownership is not
 * consulted: the redirect is the one public thing a link does.
 */
const resolveRedirect = async (code: string, clickData: ClickData) => {
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
};

export { resolveRedirect };
export type { ClickData };
