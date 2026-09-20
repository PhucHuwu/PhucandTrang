/**
 * Dynamic Text Variable Resolver for Love Journey Book (Backend & Universal)
 *
 * Resolves template tags such as {{couple.he}}, {{daysTogether}}, {{currentDate}}
 * inside TEXT elements at runtime without using eval().
 *
 * Security & Reliability:
 * - Completely eval-free using pure Regex tokenization
 * - Strict prototype-pollution safeguards against __proto__, constructor, and prototype
 * - Fail-safe: Missing or invalid variables will never throw or crash
 * - Extensible: Supports custom variable handlers and filters
 */

export interface VariableContext {
  couple?: {
    he?: string;
    she?: string;
    anniversaryDate?: string;
    proposalQuote?: string;
    [key: string]: any;
  };
  anniversaryDate?: string | Date;
  daysTogether?: number | string;
  currentDate?: string | Date;
  book?: {
    title?: string;
    slug?: string;
    [key: string]: any;
  };
  page?: {
    pageNumber?: number;
    chapter?: string;
    title?: string;
    [key: string]: any;
  };
  custom?: Record<string, any>;
  [key: string]: any;
}

export type CustomVariableHandler = (context: VariableContext) => any;
export type TextFilter = (value: any) => string;

// Blacklisted property names to defend against prototype pollution
const FORBIDDEN_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

/**
 * Format a Date or date string to Vietnamese friendly DD.MM.YYYY
 */
export function formatLoveDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Calculates total elapsed days from anniversary date until today
 */
export function calculateDaysTogether(
  anniversaryInput?: string | Date | null,
  referenceDate: Date = new Date()
): number {
  if (!anniversaryInput) {
    anniversaryInput = '2022-10-20T00:00:00';
  }

  const start =
    typeof anniversaryInput === 'string'
      ? new Date(anniversaryInput).getTime()
      : anniversaryInput.getTime();

  if (isNaN(start)) return 0;

  const diffMs = referenceDate.getTime() - start;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Safely traverses a dot-separated object path without evaluating code.
 */
export function safeGetPath(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (!key || FORBIDDEN_KEYS.has(key)) {
      return undefined;
    }
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Registry and Extensible Resolver for Dynamic Text Variables
 */
export class TextVariableResolver {
  private static customVariables = new Map<string, CustomVariableHandler>();
  private static filters = new Map<string, TextFilter>();

  static {
    this.registerFilter('uppercase', (val) => String(val ?? '').toUpperCase());
    this.registerFilter('lowercase', (val) => String(val ?? '').toLowerCase());
    this.registerFilter('number', (val) => {
      const num = Number(val);
      return isNaN(num) ? String(val ?? '') : num.toLocaleString('vi-VN');
    });
    this.registerFilter('date', (val) => formatLoveDate(val));
  }

  static registerVariable(key: string, handler: CustomVariableHandler): void {
    if (!key || FORBIDDEN_KEYS.has(key)) return;
    this.customVariables.set(key, handler);
  }

  static registerFilter(name: string, filter: TextFilter): void {
    if (!name || FORBIDDEN_KEYS.has(name)) return;
    this.filters.set(name.toLowerCase(), filter);
  }

  static createContext(options?: {
    book?: any;
    page?: any;
    extra?: Record<string, any>;
  }): VariableContext {
    const book = options?.book || {};
    const page = options?.page || {};
    const extra = options?.extra || {};

    const rawAnniversary =
      book.couple?.anniversaryDate ||
      book.anniversaryDate ||
      extra.anniversaryDate ||
      '2022-10-20T00:00:00';

    const daysCount = calculateDaysTogether(rawAnniversary);

    const context: VariableContext = {
      couple: {
        he: book.couple?.he || book.heName || 'Phúc',
        she: book.couple?.she || book.sheName || 'Trang',
        anniversaryDate: formatLoveDate(rawAnniversary),
        proposalQuote:
          book.couple?.proposalQuote ||
          book.proposalQuote ||
          'Thế cậu đồng ý làm bạn gái tớ không?',
      },
      anniversaryDate: formatLoveDate(rawAnniversary),
      daysTogether: daysCount,
      currentDate: formatLoveDate(new Date()),
      book: {
        title: book.title || 'Chúng Mình',
        slug: book.slug || 'phuc-and-trang',
      },
      page: {
        pageNumber: page.pageNumber,
        chapter: page.chapter,
        title: page.title,
      },
      ...extra,
    };

    return context;
  }

  static resolve(text: string, context?: VariableContext): string {
    if (!text || typeof text !== 'string') return text ?? '';
    if (!text.includes('{{')) return text;

    const ctx = context || this.createContext();
    const pattern = /\{\{\s*([a-zA-Z0-9_.]+)(?:\s*\|\s*([a-zA-Z0-9_]+))?\s*\}\}/g;

    try {
      return text.replace(pattern, (match, path, filterName) => {
        try {
          let resolvedValue: any;

          if (this.customVariables.has(path)) {
            const handler = this.customVariables.get(path)!;
            resolvedValue = handler(ctx);
          } else if (Object.prototype.hasOwnProperty.call(ctx, path)) {
            resolvedValue = ctx[path];
          } else if (path.includes('.')) {
            resolvedValue = safeGetPath(ctx, path);
          } else if (path === 'he' && ctx.couple?.he) {
            resolvedValue = ctx.couple.he;
          } else if (path === 'she' && ctx.couple?.she) {
            resolvedValue = ctx.couple.she;
          }

          if (resolvedValue === undefined || resolvedValue === null) {
            return match;
          }

          if (filterName) {
            const filter = this.filters.get(filterName.toLowerCase());
            if (filter) {
              return filter(resolvedValue);
            }
          }

          return String(resolvedValue);
        } catch {
          return match;
        }
      });
    } catch {
      return text;
    }
  }

  static resolveLines(lines: string[], context?: VariableContext): string[] {
    if (!Array.isArray(lines)) return [];
    return lines.map((line) => this.resolve(line, context));
  }
}
