import type { PoolConfig } from 'pg';

/**
 * TLS options for node-postgres.
 *
 * pg@8 parses `sslmode` from the connection string and that result overrides the `ssl` option
 * passed alongside it: `sslmode=require|verify-full` becomes `ssl: {}`, i.e. full certificate and
 * hostname verification against Node's trusted CAs (which covers Neon's public certificate).
 * So the URL alone already verifies; the explicit `rejectUnauthorized: true` documents intent
 * and covers URLs without sslmode. DB_SSL_INSECURE=true is an escape hatch that skips verification
 * (it is applied by appending `sslmode=no-verify`, since an ssl object would be overridden).
 */
export function buildPoolConfig(connectionString: string, env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const insecure = env.DB_SSL_INSECURE === 'true';
  const wantsSsl = /[?&]sslmode=/i.test(connectionString) && !/[?&]sslmode=disable/i.test(connectionString);

  let effectiveConnectionString = connectionString;
  let ssl: PoolConfig['ssl'] = undefined;
  if (wantsSsl) {
    if (insecure) {
      effectiveConnectionString = connectionString.replace(/([?&])sslmode=[^&]*/i, '$1sslmode=no-verify');
      ssl = { rejectUnauthorized: false };
    } else {
      ssl = { rejectUnauthorized: true };
    }
  }

  return {
    connectionString: effectiveConnectionString,
    ssl,
    // Serverless: each instance should hold only a few connections and drop idle ones quickly
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
  };
}
