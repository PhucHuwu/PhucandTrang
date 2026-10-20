import { buildPoolConfig } from './pool-config';

describe('buildPoolConfig', () => {
  const neonUrl = 'postgresql://u:p@ep-x.neon.tech/db?sslmode=require&channel_binding=require';

  it('verifies certificates by default when sslmode is set', () => {
    const config = buildPoolConfig(neonUrl, {});
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.connectionString).toBe(neonUrl);
  });

  it('lets DB_SSL_INSECURE=true opt out of verification', () => {
    const config = buildPoolConfig(neonUrl, { DB_SSL_INSECURE: 'true' });
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
    expect(config.connectionString).toContain('sslmode=no-verify');
    expect(config.connectionString).toContain('channel_binding=require');
  });

  it('leaves TLS off for local URLs without sslmode', () => {
    expect(buildPoolConfig('postgresql://postgres:postgres@localhost:5432/db', {}).ssl).toBeUndefined();
  });

  it('keeps the pool small for serverless', () => {
    const config = buildPoolConfig(neonUrl, {});
    expect(config.max).toBe(5);
    expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
    expect(config.idleTimeoutMillis).toBeGreaterThan(0);
  });

  it('resolves to a verifying TLS config inside node-postgres', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ConnectionParameters = require('pg/lib/connection-parameters');
    const warn = jest.spyOn(process, 'emitWarning').mockImplementation(() => undefined);
    try {
      const secure = new ConnectionParameters(buildPoolConfig(neonUrl, {}));
      expect(secure.ssl.rejectUnauthorized).not.toBe(false);
      const insecure = new ConnectionParameters(buildPoolConfig(neonUrl, { DB_SSL_INSECURE: 'true' }));
      expect(insecure.ssl.rejectUnauthorized).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });
});
