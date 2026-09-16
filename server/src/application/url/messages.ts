/**
 * What the user is told when a link use case refuses. Shared rather than
 * repeated, so the wording of a single answer cannot drift between the use
 * cases that give it.
 */

const SLUG_TAKEN = 'This custom slug is already in use';

/** Answered for a link that is missing as well as for one owned by someone
 * else, so no one can probe which short codes are taken */
const URL_NOT_FOUND = 'URL not found';

export { SLUG_TAKEN, URL_NOT_FOUND };
