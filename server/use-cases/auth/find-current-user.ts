import userRepository from '../../repositories/user';

/** Reads the account behind an access token that has already been verified */
const findCurrentUser = async (userId: string) =>
  await userRepository.findById(userId);

export { findCurrentUser };
