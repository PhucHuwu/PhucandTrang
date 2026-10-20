import { createHash } from 'crypto';

const LEAKED_DEFAULT = 'super_secret_romantic_jwt_key';
const MIN_PRODUCTION_LENGTH = 32;

let weakSecretWarned = false;

/** No fallback in any environment: a default secret in the repo would let anyone sign admin tokens. */
export function requireJwtSecret(secret: string | undefined): string {
  if (!secret || secret.includes(LEAKED_DEFAULT)) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable must be set to a private random value.',
    );
  }
  // Warn instead of refusing to boot, so an existing shorter production secret never takes the API down
  if (
    process.env.NODE_ENV === 'production' &&
    secret.length < MIN_PRODUCTION_LENGTH &&
    !weakSecretWarned
  ) {
    weakSecretWarned = true;
    console.warn(
      `⚠️ SECURITY WARNING: JWT_SECRET is only ${secret.length} characters long. Rotate it to a random value of at least ${MIN_PRODUCTION_LENGTH} characters.`,
    );
  }
  return secret;
}

/**
 * Short fingerprint of the stored password hash, embedded in tokens as `pwf`.
 * Changing the password changes the fingerprint, which revokes every token issued before.
 */
export function passwordFingerprint(
  passwordHash: string,
  secret: string | undefined,
): string {
  return createHash('sha256')
    .update(`${passwordHash}${secret || ''}`)
    .digest('hex')
    .slice(0, 16);
}
