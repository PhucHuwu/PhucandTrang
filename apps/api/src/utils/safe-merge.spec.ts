import { safeDeepMerge } from './safe-merge';

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
    const malicious = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"name":"evil"}}');

    const result = safeDeepMerge(target, malicious);

    expect(result.name).toBe('Test');
    expect((Object.prototype as any).polluted).toBeUndefined();
  });
});
