/**
 * Domain shapes the business rules work with. Deliberately free of Prisma so
 * the service layer never depends on the database it happens to run on.
 */
type Url = {
  id: string;
  shortCode: string;
  customSlug: string | null;
  originalUrl: string;
  expiresAt: Date | null;
  createdAt: Date;
};

type Click = {
  id: string;
  userAgent: string | null;
  referer: string | null;
  createdAt: Date;
};

type UrlWithClickCount = Url & { clickCount: number };

type UrlWithClickEvents = Url & { clickEvents: Click[] };

type NewUrl = {
  shortCode: string;
  customSlug: string | null;
  originalUrl: string;
  expiresAt: Date | null;
};

type NewClick = {
  urlId: string;
  userAgent?: string;
  referer?: string;
  ip?: string;
};

export type {
  Url,
  Click,
  NewUrl,
  NewClick,
  UrlWithClickCount,
  UrlWithClickEvents,
};
