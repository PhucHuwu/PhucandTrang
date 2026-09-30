/**
 * Safely parses numeric input from input/range events.
 * Guarantees that 0 is preserved as a valid numeric value instead of falling back to default.
 */
export function safeParseFloat(value: unknown, fallback: number = 0): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : fallback;
}

export function safeParseInt(value: unknown, fallback: number = 0): number {
  const num = typeof value === 'number' ? Math.floor(value) : parseInt(String(value), 10);
  return Number.isFinite(num) ? num : fallback;
}
