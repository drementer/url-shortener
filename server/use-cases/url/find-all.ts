import urlRepository from '../../repositories/url';

/** Lists the links of one owner, with how often each was visited */
const findAllUrls = async (userId: string) =>
  await urlRepository.findAllByUser(userId);

export { findAllUrls };
