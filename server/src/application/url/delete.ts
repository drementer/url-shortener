import urlRepository from '../../infrastructure/repositories/url';
import { NotFoundError } from '../../domain/errors';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { recordAuditEvent } from '../audit';
import { URL_NOT_FOUND } from './messages';
import type { AuditActor } from '../../domain/types';

/** Removes a link, provided the caller is the one who owns it */
const deleteUrl = async (code: string, userId: string, actor?: AuditActor) => {
  const existing = await urlRepository.findOwned(code, userId);
  if (!existing) throw new NotFoundError(URL_NOT_FOUND);

  const deletedCount = await urlRepository.deleteOwned(code, userId);
  if (!deletedCount) throw new NotFoundError(URL_NOT_FOUND);

  await recordAuditEvent({
    action: AUDIT_ACTIONS.URL_DELETED,
    actorId: actor?.id ?? userId,
    actorEmail: actor?.email,
    targetType: 'Url',
    targetId: existing.id,
    metadata: {
      shortCode: code,
      originalUrl: existing.originalUrl,
    },
    ip: actor?.ip,
    userAgent: actor?.userAgent,
  });
};

export { deleteUrl };
