/**
 * The rules and defaults governing roles and their link quotas, independent of
 * how they are stored or served.
 */

const DEFAULT_ROLE_NAME = 'USER';
const EDITOR_ROLE_NAME = 'EDITOR';
const ADMIN_ROLE_NAME = 'ADMIN';

const DEFAULT_USER_MAX_ACTIVE_LINKS = 5;
const DEFAULT_EDITOR_MAX_ACTIVE_LINKS = 10;

/**
 * Checks whether an account can allocate another active link under its quota.
 * A null limit means unlimited active links.
 */
const canCreateLink = (
  activeLinkCount: number,
  maxActiveLinks: number | null | undefined,
): boolean => {
  if (maxActiveLinks === null || maxActiveLinks === undefined) return true;
  return activeLinkCount < maxActiveLinks;
};

const formatQuotaExceededMessage = (
  roleName: string,
  maxActiveLinks: number,
): string =>
  `Active link quota exceeded (maximum ${maxActiveLinks} active links allowed for role ${roleName})`;

export {
  DEFAULT_ROLE_NAME,
  EDITOR_ROLE_NAME,
  ADMIN_ROLE_NAME,
  DEFAULT_USER_MAX_ACTIVE_LINKS,
  DEFAULT_EDITOR_MAX_ACTIVE_LINKS,
  canCreateLink,
  formatQuotaExceededMessage,
};
