import urlRepository from '../../repositories/url';
import userRepository from '../../repositories/user';
import { resolveExpiry } from '../../domain/url';
import {
  canCreateLink,
  formatQuotaExceededMessage,
  DEFAULT_ROLE_NAME,
  DEFAULT_USER_MAX_ACTIVE_LINKS,
} from '../../domain/role';
import { createShortCode } from '../../utils/short-code';
import {
  ConflictError,
  QuotaExceededError,
  UniqueConstraintError,
} from '../../errors';
import { SLUG_TAKEN } from './messages';
import type { NewUrl } from '../../types';

const MAX_RETRIES = 5;

type CreateUrlCommand = {
  url: string;
  customSlug?: string;
  expiresIn?: number;
};

/** Everything about a new link except the code it will live under */
type UnnamedUrl = Omit<NewUrl, 'shortCode' | 'customSlug'>;

/**
 * Writes the row under a generated code, trying again when that code is
 * already taken. A collision here is a coincidence rather than the user's
 * doing, so it is retried instead of reported.
 */
const allocateShortCode = async (
  url: UnnamedUrl,
  quota?: { maxActiveLinks?: number | null; roleName?: string },
) => {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await urlRepository.create(
        {
          ...url,
          shortCode: createShortCode(),
          customSlug: null,
        },
        quota,
      );
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) throw error;
    }
  }

  throw new Error('Could not generate a unique short code');
};

/**
 * Writes the row under the code the user picked. Retrying would reuse the same
 * value, so a collision is reported instead.
 */
const claimSlug = async (
  url: UnnamedUrl,
  slug: string,
  quota?: { maxActiveLinks?: number | null; roleName?: string },
) => {
  try {
    // customSlug is kept alongside shortCode to record that the user chose it
    return await urlRepository.create(
      {
        ...url,
        shortCode: slug,
        customSlug: slug,
      },
      quota,
    );
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) throw error;

    throw new ConflictError(SLUG_TAKEN);
  }
};

// Input shape is guaranteed by createUrlSchema at the route level
const createUrl = async (
  { url, customSlug, expiresIn }: CreateUrlCommand,
  userId: string,
) => {
  const user = await userRepository.findById(userId);
  const roleName = user?.role?.name ?? DEFAULT_ROLE_NAME;
  const maxActiveLinks =
    user?.role != null
      ? user.role.maxActiveLinks
      : DEFAULT_USER_MAX_ACTIVE_LINKS;

  const quota = { maxActiveLinks, roleName };
  const row = { originalUrl: url, expiresAt: resolveExpiry(expiresIn), userId };

  if (!customSlug) {
    return await allocateShortCode(row, quota);
  }

  // Early check so a taken slug fails before hitting the unique constraint
  const existingUrl = await urlRepository.findByShortCode(customSlug);
  if (existingUrl) throw new ConflictError(SLUG_TAKEN);

  return await claimSlug(row, customSlug, quota);
};

export { createUrl };
export type { CreateUrlCommand };
