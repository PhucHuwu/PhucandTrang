import { safeDeepMerge } from '@phucandtrang/shared';

describe('Safe Deep Merge Utility (Req 23)', () => {
  it('should deeply merge objects without overwriting existing sibling fields', () => {
    const target = {
      fontFamily: 'Montserrat',
      fontSize: 24,
      color: '#000',
      nested: { a: 1, b: 2 },
    };

    const source = {
      fontSize: 32,
      nested: { b: 20, c: 30 },
    };

    const result = safeDeepMerge(target, source);

    expect(result.fontSize).toBe(32);
    expect(result.fontFamily).toBe('Montserrat');
    expect(result.color).toBe('#000');
    expect(result.nested).toEqual({ a: 1, b: 20, c: 30 });
  });

  it('should strictly block prototype pollution keys', () => {
    const target = { name: 'Test' };
    const malicious = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"name":"evil"}}',
    );

    const result = safeDeepMerge(target, malicious);

    expect(result.name).toBe('Test');
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it('keeps explicit null values by default (existing callers unchanged)', () => {
    const result = safeDeepMerge({ a: 1, b: 2 } as any, { b: null });
    expect(result).toEqual({ a: 1, b: null });
  });

  it('with nullDeletes, explicit null removes the key at any depth', () => {
    const target = {
      color: '#000',
      shadow: { blur: 4, color: 'red' },
      keep: true,
    };
    const result = safeDeepMerge(
      target as any,
      { color: null, shadow: { color: null }, extra: { x: 1, y: null } },
      { nullDeletes: true },
    );

    expect(result).toEqual({
      shadow: { blur: 4 },
      keep: true,
      extra: { x: 1 },
    });
    expect('color' in result).toBe(false);
  });

  it('with nullDeletes, still blocks prototype pollution keys', () => {
    const malicious = JSON.parse(
      '{"__proto__":{"polluted":true},"nested":{"constructor":null,"__proto__":{"x":1}}}',
    );
    const result = safeDeepMerge({ nested: { a: 1 } } as any, malicious, {
      nullDeletes: true,
    });

    expect(result).toEqual({ nested: { a: 1 } });
    expect((Object.prototype as any).polluted).toBeUndefined();
    expect((Object.prototype as any).x).toBeUndefined();
  });
});
