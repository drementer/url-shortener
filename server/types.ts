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
  userId: string | null;
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

/**
 * Every method carrying a userId scopes its query to that owner, so a link
 * belonging to someone else is indistinguishable from one that does not exist.
 * findByShortCode is the exception: the public redirect has no owner.
 */
type UrlQuotaOptions = {
  maxActiveLinks?: number | null;
  roleName?: string;
};

type UrlRepository = {
  findAllByUser(userId: string): Promise<UrlWithClickCount[]>;
  create(url: NewUrl, quota?: UrlQuotaOptions): Promise<Url>;
  findByShortCode(shortCode: string): Promise<Url | null>;
  findOwnedWithClicks(
    shortCode: string,
    userId: string,
  ): Promise<UrlWithClickEvents | null>;
  deleteOwned(shortCode: string, userId: string): Promise<number>;
  countActiveByUser(userId: string): Promise<number>;
};

type UserRepository = {
  create(user: NewUser): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  updateRole(userId: string, roleId: string | null): Promise<User>;
};

type RoleRepository = {
  findAll(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(role: NewRole): Promise<Role>;
  update(id: string, role: UpdateRole): Promise<Role>;
  delete(id: string): Promise<number>;
};

type SessionRepository = {
  create(session: NewSession): Promise<Session>;
  findByTokenHash(refreshTokenHash: string): Promise<Session | null>;
  /** Number of sessions actually revoked by the call, so at most one */
  revoke(id: string): Promise<number>;
  revokeAllForUser(userId: string): Promise<unknown>;
  rotate(
    oldSessionId: string,
    userId: string,
    newSession: NewSession,
  ): Promise<Session | null>;
};

type ClickRepository = {
  create(click: NewClick): Promise<unknown>;
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
  UrlRepository,
  ClickRepository,
  UserRepository,
  RoleRepository,
  SessionRepository,
};
