/**
 * Shared types for the whole server.
 *
 * The Url and Click shapes are written out by hand rather than taken from
 * Prisma, so a change to the database schema cannot silently reshape the API.
 * The repository types are the contract storage must satisfy, which is what
 * makes a repository returning the wrong shape a compile error.
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

type UrlRepository = {
  findAll(): Promise<UrlWithClickCount[]>;
  create(url: NewUrl): Promise<Url>;
  findByShortCode(shortCode: string): Promise<Url | null>;
  findByShortCodeWithClicks(
    shortCode: string,
  ): Promise<UrlWithClickEvents | null>;
  delete(shortCode: string): Promise<number>;
};

type ClickRepository = {
  create(click: NewClick): Promise<unknown>;
};

export type {
  Url,
  Click,
  NewUrl,
  NewClick,
  UrlWithClickCount,
  UrlWithClickEvents,
  UrlRepository,
  ClickRepository,
};
