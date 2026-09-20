import {
  TextVariableResolver,
  calculateDaysTogether,
  formatLoveDate,
  safeGetPath,
} from './text-variable-resolver';

describe('TextVariableResolver (Prompt 13 - Dynamic Text Variables)', () => {
  const mockContext = TextVariableResolver.createContext({
    book: {
      title: 'Chúng Mình',
      slug: 'phuc-and-trang',
      couple: {
        he: 'Phúc',
        she: 'Trang',
        anniversaryDate: '2022-10-20T00:00:00Z',
      },
    },
    page: {
      pageNumber: 5,
      chapter: 'Chapter V',
      title: 'Kỷ Niệm',
    },
  });

  describe('Core Variables Resolution', () => {
    it('should resolve {{couple.he}} and {{couple.she}}', () => {
      const template = 'Cuốn sách tình yêu của {{couple.he}} và {{couple.she}}';
      const result = TextVariableResolver.resolve(template, mockContext);
      expect(result).toBe('Cuốn sách tình yêu của Phúc và Trang');
    });

    it('should resolve {{anniversaryDate}}', () => {
      const template = 'Bên nhau từ ngày {{anniversaryDate}}';
      const result = TextVariableResolver.resolve(template, mockContext);
      expect(result).toContain('20.10.2022');
    });

    it('should resolve {{daysTogether}} and "{{daysTogether}} NGÀY"', () => {
      const template = '{{daysTogether}} NGÀY';
      const result = TextVariableResolver.resolve(template, mockContext);
      expect(result).toMatch(/^\d+ NGÀY$/);

      const days = parseInt(result.split(' ')[0], 10);
      expect(days).toBeGreaterThan(1000); // 2022 to current date is > 1000 days
    });

    it('should resolve {{currentDate}} without error', () => {
      const template = 'Hôm nay là ngày {{currentDate}}';
      const result = TextVariableResolver.resolve(template, mockContext);
      expect(result).toMatch(/Hôm nay là ngày \d{2}\.\d{2}\.\d{4}/);
    });

    it('should resolve multiple variables in one string', () => {
      const template =
        '{{couple.he}} & {{couple.she}} đã bên nhau {{daysTogether}} ngày kể từ {{anniversaryDate}}';
      const result = TextVariableResolver.resolve(template, mockContext);

      expect(result).toContain('Phúc & Trang');
      expect(result).toContain('ngày kể từ 20.10.2022');
    });
  });

  describe('Safety & Resilience (No Eval, No Crashing)', () => {
    it('should not crash when variable does not exist in context', () => {
      const template = 'Xin chào {{unknown.missing.variable}}!';
      const result = TextVariableResolver.resolve(template, mockContext);
      expect(result).toBe('Xin chào {{unknown.missing.variable}}!');
    });

    it('should not crash when given null or undefined or empty string', () => {
      expect(TextVariableResolver.resolve('')).toBe('');
      expect(TextVariableResolver.resolve(null as any)).toBe('');
      expect(TextVariableResolver.resolve(undefined as any)).toBe('');
    });

    it('should strictly block prototype pollution attempts', () => {
      const safe1 = safeGetPath({}, '__proto__.isAdmin');
      expect(safe1).toBeUndefined();

      const safe2 = safeGetPath({}, 'constructor.prototype');
      expect(safe2).toBeUndefined();

      const template = 'Hack: {{__proto__.polluted}} {{constructor.name}}';
      const result = TextVariableResolver.resolve(template, mockContext);
      expect(result).toBe('Hack: {{__proto__.polluted}} {{constructor.name}}');
    });
  });

  describe('Extensibility (Custom Variables & Filters)', () => {
    it('should support registering custom variable handlers', () => {
      TextVariableResolver.registerVariable('customGreeting', (ctx) => {
        return `Chào ${ctx.couple?.she}, mình là ${ctx.couple?.he}!`;
      });

      const template = 'Lời nhắn: {{customGreeting}}';
      const result = TextVariableResolver.resolve(template, mockContext);
      expect(result).toBe('Lời nhắn: Chào Trang, mình là Phúc!');
    });

    it('should support custom filters like uppercase and number formatting', () => {
      const templateUpper = 'Tên: {{couple.he | uppercase}} & {{couple.she | uppercase}}';
      const resultUpper = TextVariableResolver.resolve(templateUpper, mockContext);
      expect(resultUpper).toBe('Tên: PHÚC & TRANG');

      const templateNumber = 'Số ngày: {{daysTogether | number}}';
      const resultNumber = TextVariableResolver.resolve(templateNumber, mockContext);
      expect(resultNumber).toMatch(/Số ngày: \d{1,3}(\.\d{3})*/);
    });

    it('should resolve array of text lines', () => {
      const lines = [
        'Dòng 1: {{couple.he}}',
        'Dòng 2: {{couple.she}}',
        'Dòng 3: {{daysTogether}} ngày',
      ];
      const resolved = TextVariableResolver.resolveLines(lines, mockContext);
      expect(resolved[0]).toBe('Dòng 1: Phúc');
      expect(resolved[1]).toBe('Dòng 2: Trang');
      expect(resolved[2]).toMatch(/Dòng 3: \d+ ngày/);
    });
  });

  describe('Helper functions', () => {
    it('formatLoveDate should format ISO string properly', () => {
      expect(formatLoveDate('2022-10-20T00:00:00Z')).toBe('20.10.2022');
    });

    it('calculateDaysTogether should calculate elapsed days accurately', () => {
      const fixedNow = new Date('2022-10-30T00:00:00Z');
      const days = calculateDaysTogether('2022-10-20T00:00:00Z', fixedNow);
      expect(days).toBe(10);
    });
  });
});
