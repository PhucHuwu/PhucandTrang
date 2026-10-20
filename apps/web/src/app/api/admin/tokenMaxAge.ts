const DEFAULT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Cookie lifetime matching the token's own `exp` claim (read without verifying; the backend
 * verifies on every request). Falls back to 7 days when the token carries no usable expiry.
 */
export function tokenCookieMaxAge(token: string, nowMs: number = Date.now()): number {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return DEFAULT_MAX_AGE_SECONDS;
    const json = Buffer.from(payloadPart.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const exp = JSON.parse(json)?.exp;
    if (typeof exp !== 'number' || !Number.isFinite(exp)) return DEFAULT_MAX_AGE_SECONDS;
    const remaining = Math.floor(exp - nowMs / 1000);
    return Math.max(remaining, 0);
  } catch {
    return DEFAULT_MAX_AGE_SECONDS;
  }
}
