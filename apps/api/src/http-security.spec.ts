import {
  buildCorsOrigin,
  DEFAULT_PRODUCTION_ORIGINS,
  securityHeaders,
} from './http-security';

describe('HTTP security configuration', () => {
  const previewPattern = DEFAULT_PRODUCTION_ORIGINS.find(
    (o) => o instanceof RegExp,
  ) as RegExp;

  it('allows only this project’s Vercel previews', () => {
    expect(
      previewPattern.test('https://we-phuchuwus-projects.vercel.app'),
    ).toBe(true);
    expect(
      previewPattern.test('https://we-bgpqa42gv-phuchuwus-projects.vercel.app'),
    ).toBe(true);
    expect(
      previewPattern.test(
        'https://we-git-fix-audit-hardening-phuchuwus-projects.vercel.app',
      ),
    ).toBe(true);
    expect(previewPattern.test('https://attacker.vercel.app')).toBe(false);
    expect(
      previewPattern.test(
        'https://we-x-phuchuwus-projects.vercel.app.evil.com',
      ),
    ).toBe(false);
    expect(
      previewPattern.test('https://evil-we-phuchuwus-projects.vercel.app'),
    ).toBe(false);
    expect(previewPattern.test('http://we-phuchuwus-projects.vercel.app')).toBe(
      false,
    );
  });

  it('honours CORS_ORIGINS in production', () => {
    expect(
      buildCorsOrigin(true, 'https://a.example, https://b.example'),
    ).toEqual(['https://a.example', 'https://b.example']);
    expect(buildCorsOrigin(true)).toBe(DEFAULT_PRODUCTION_ORIGINS);
  });

  it('allows only local origins (or none) in development', () => {
    const origin = buildCorsOrigin(false) as (
      o: string | undefined,
      cb: (e: any, ok?: boolean) => void,
    ) => void;
    const check = (o?: string) => {
      let allowed: boolean | undefined;
      origin(o, (_e, ok) => (allowed = ok));
      return allowed;
    };
    expect(check(undefined)).toBe(true);
    expect(check('http://localhost:3000')).toBe(true);
    expect(check('http://127.0.0.1:3000')).toBe(true);
    expect(check('https://evil.example')).toBe(false);
    expect(check('http://localhost.evil.example')).toBe(false);
  });

  it('sets basic security headers', () => {
    const headers: Record<string, string> = {};
    const next = jest.fn();
    securityHeaders(
      {},
      { setHeader: (k: string, v: string) => (headers[k] = v) },
      next,
    );
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
