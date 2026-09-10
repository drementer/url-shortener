import urlRepository from '../../repositories/url';
import type { Page } from '../../types';

/** Lists one page of an owner's links, with how often each was visited */
const findAllUrls = async (userId: string, page: Page) =>
  await urlRepository.findAllByUser(userId, page);

export { findAllUrls };
