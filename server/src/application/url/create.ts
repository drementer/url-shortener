import urlRepository from '../../infrastructure/repositories/url';
import userRepository from '../../infrastructure/repositories/user';
import { resolveExpiry } from '../../domain/url';
import {
  DEFAULT_ROLE_NAME,
  DEFAULT_USER_MAX_ACTIVE_LINKS,
} from '../../domain/role';
import { createShortCode } from '../../domain/short-code';
import { ConflictError, UniqueConstraintError } from '../../domain/errors';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { recordAuditEvent } from '../audit';
import { SLUG_TAKEN } from './messages';
import type { AuditActor, NewUrl } from '../../domain/types';
import type { UrlQuotaOptions } from '../ports';

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
  quota?: UrlQuotaOptions,
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
  quota?: UrlQuotaOptions,
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
  actor?: AuditActor,
) => {
  const user = await userRepository.findById(userId);
  const roleName = user?.role?.name ?? DEFAULT_ROLE_NAME;
  const maxActiveLinks =
    user?.role != null
      ? user.role.maxActiveLinks
      : DEFAULT_USER_MAX_ACTIVE_LINKS;

  const quota = { maxActiveLinks, roleName };
  const row = { originalUrl: url, expiresAt: resolveExpiry(expiresIn), userId };

  let created;
  if (!customSlug) {
    created = await allocateShortCode(row, quota);
  } else {
    // Early check so a taken slug fails before hitting the unique constraint
    const existingUrl = await urlRepository.findByShortCode(customSlug);
    if (existingUrl) throw new ConflictError(SLUG_TAKEN);

    created = await claimSlug(row, customSlug, quota);
  }

  await recordAuditEvent({
    action: AUDIT_ACTIONS.URL_CREATED,
    actorId: actor?.id ?? userId,
    actorEmail: actor?.email ?? user?.email,
    targetType: 'Url',
    targetId: created.id,
    metadata: {
      shortCode: created.shortCode,
      originalUrl: created.originalUrl,
      ...(created.customSlug ? { customSlug: created.customSlug } : {}),
      ...(created.expiresAt
        ? { expiresAt: created.expiresAt.toISOString() }
        : {}),
    },
    ip: actor?.ip,
    userAgent: actor?.userAgent,
  });

  return created;
};

export { createUrl };
export type { CreateUrlCommand };
