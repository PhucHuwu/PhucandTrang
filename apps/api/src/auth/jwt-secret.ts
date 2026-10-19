const LEAKED_DEFAULT = 'super_secret_romantic_jwt_key';

/** No fallback in any environment: a default secret in the repo would let anyone sign admin tokens. */
export function requireJwtSecret(secret: string | undefined): string {
  if (!secret || secret.includes(LEAKED_DEFAULT)) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set to a private random value.');
  }
  return secret;
}
