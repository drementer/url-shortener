import urlRepository from '../../infrastructure/repositories/url';
import { NotFoundError } from '../../domain/errors';
import { URL_NOT_FOUND } from './messages';

/** Hands back the click history of a link its owner asked about */
const getUrlStats = async (code: string, userId: string) => {
  const stats = await urlRepository.findOwnedWithClicks(code, userId);
  if (!stats) throw new NotFoundError(URL_NOT_FOUND);

  return stats;
};

export { getUrlStats };
