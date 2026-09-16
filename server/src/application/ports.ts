/**
 * The contract storage must satisfy, so a repository returning the wrong shape
 * is a compile error rather than a surprise at the call site.
 */

import type {
  Url,
  NewUrl,
  UrlWithClickCount,
  UrlWithClickEvents,
  User,
  UserWithPassword,
  NewUser,
  Role,
  NewRole,
  UpdateRole,
  Session,
  NewSession,
  NewClick,
  Page,
  Paged,
} from '../domain/types';

/** The caller's link allowance, as the repository needs it to enforce a quota */
type UrlQuotaOptions = {
  maxActiveLinks?: number | null;
  roleName?: string;
};

/**
 * Every method carrying a userId scopes its query to that owner, so a link
 * belonging to someone else is indistinguishable from one that does not exist.
 * findByShortCode is the exception: the public redirect has no owner.
 */
type UrlRepository = {
  findAllByUser(userId: string, page: Page): Promise<Paged<UrlWithClickCount>>;
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
  countByRole(roleId: string): Promise<number>;
};

type RoleRepository = {
  findAll(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(role: NewRole): Promise<Role>;
  update(id: string, role: UpdateRole): Promise<Role>;
  /** Deletes only while no user holds the role, so the check cannot go stale */
  deleteIfUnassigned(id: string): Promise<number>;
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
  UrlQuotaOptions,
  UrlRepository,
  UserRepository,
  RoleRepository,
  SessionRepository,
  ClickRepository,
};
