type CorsCallback = (err: Error | null, allow?: boolean) => void;
type CorsOrigin =
  | (string | RegExp)[]
  | ((origin: string | undefined, callback: CorsCallback) => void);

export const DEFAULT_PRODUCTION_ORIGINS: (string | RegExp)[] = [
  'https://love.phuchuwu.io.vn',
  'https://phucandtrang.love',
  'https://phuc-and-trang.vercel.app',
  // Previews of the "we" project only: deployment URLs (we-<hash>-…) and branch aliases (we-git-<branch>-…)
  /^https:\/\/we(-[a-z0-9]+|-git-[a-z0-9-]+)?-phuchuwus-projects\.vercel\.app$/,
];

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      LOCAL_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function buildCorsOrigin(
  isProduction: boolean,
  corsOriginsEnv?: string,
): CorsOrigin {
  if (isProduction) {
    if (corsOriginsEnv) {
      return corsOriginsEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return DEFAULT_PRODUCTION_ORIGINS;
  }
  // Development: only local pages (and server-to-server calls without an Origin header)
  return (origin, callback) => callback(null, !origin || isLocalOrigin(origin));
}

/** Minimal security headers for every API response (no helmet dependency). */
export function securityHeaders(_req: any, res: any, next: () => void) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}
