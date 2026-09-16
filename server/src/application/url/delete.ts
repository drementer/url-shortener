import urlRepository from '../../infrastructure/repositories/url';
import { NotFoundError } from '../../domain/errors';
import { URL_NOT_FOUND } from './messages';

/** Removes a link, provided the caller is the one who owns it */
const deleteUrl = async (code: string, userId: string) => {
  const deletedCount = await urlRepository.deleteOwned(code, userId);
  if (!deletedCount) throw new NotFoundError(URL_NOT_FOUND);
};

export { deleteUrl };
