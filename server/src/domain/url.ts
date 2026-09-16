/**
 * The rules a short link obeys, independent of how it is stored or served.
 * Kept apart from the use cases so each rule has one address and
 * cannot drift between the call paths that need it.
 */

const HOUR_IN_MS = 60 * 60 * 1000;

/** A link without an expiry date never expires */
const isExpired = (expiresAt: Date | null) =>
  !!expiresAt && expiresAt < new Date();

/**
 * Turns a lifetime in hours into an absolute date, or null for no expiry.
 * Counts elapsed time rather than calendar hours, so a link outlives a daylight
 * saving transition by exactly the requested duration.
 */
const resolveExpiry = (expiresIn?: number) => {
  if (!expiresIn) return null;

  return new Date(Date.now() + expiresIn * HOUR_IN_MS);
};

export { isExpired, resolveExpiry };
