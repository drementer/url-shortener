import type { Click, Url, UrlWithClickEvents } from '../entities/url';

// clickCount is absent on a freshly created url, which by definition has none
type MappableUrl = Url & { clickCount?: number };

/**
 * Shapes domain objects into the public API contract, so a schema change does
 * not leak straight through to clients. Visitor IPs stay internal.
 */
const toResponse = (url: Url, clicks: number) => ({
  id: url.id,
  shortCode: url.shortCode,
  originalUrl: url.originalUrl,
  clicks,
  expiresAt: url.expiresAt,
  createdAt: url.createdAt,
});

const toUrlResponse = (url: MappableUrl) => toResponse(url, url.clickCount ?? 0);

const toClickResponse = (click: Click) => ({
  id: click.id,
  userAgent: click.userAgent,
  referer: click.referer,
  createdAt: click.createdAt,
});

const toStatsResponse = (url: UrlWithClickEvents) => ({
  ...toResponse(url, url.clickEvents.length),
  clickEvents: url.clickEvents.map(toClickResponse),
});

export { toUrlResponse, toStatsResponse };
