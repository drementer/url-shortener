/**
 * The shapes the business rules are written against.
 *
 * Written out by hand rather than taken from Prisma, so a change to the
 * database schema cannot silently reshape the API.
 */

type Url = {
  id: string;
  shortCode: string;
  customSlug: string | null;
  originalUrl: string;
  expiresAt: Date | null;
  createdAt: Date;
  userId: string | null;
};

type Click = {
  id: string;
  userAgent: string | null;
  referer: string | null;
  createdAt: Date;
};

type UrlWithClickCount = Url & { clickCount: number };

type Page = {
  page: number;
  limit: number;
};

/** One page of a collection, carried with what the client needs to page on */
type Paged<T> = {
  items: T[];
  total: number;
};

type UrlWithClickEvents = Url & { clickEvents: Click[] };

type NewUrl = {
  shortCode: string;
  customSlug: string | null;
  originalUrl: string;
  expiresAt: Date | null;
  userId: string;
};

type Role = {
  id: string;
  name: string;
  description: string | null;
  maxActiveLinks: number | null;
  createdAt: Date;
};

type RoleSummary = {
  id: string;
  name: string;
  description: string | null;
  maxActiveLinks: number | null;
};

type NewRole = {
  name: string;
  description?: string | null;
  maxActiveLinks?: number | null;
};

type UpdateRole = {
  name?: string;
  description?: string | null;
  maxActiveLinks?: number | null;
};

/** The user as the API is allowed to see it, i.e. without the password hash */
type User = {
  id: string;
  email: string;
  roleId: string | null;
  role?: RoleSummary | null;
  createdAt: Date;
};

type UserWithPassword = User & { passwordHash: string };

type NewUser = {
  email: string;
  passwordHash: string;
  roleId?: string | null;
};

type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

type NewSession = {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
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
  User,
  UserWithPassword,
  NewUser,
  Role,
  RoleSummary,
  NewRole,
  UpdateRole,
  Session,
  NewSession,
  UrlWithClickCount,
  UrlWithClickEvents,
  Page,
  Paged,
};
