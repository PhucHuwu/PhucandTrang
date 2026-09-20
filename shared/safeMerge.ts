const FORBIDDEN_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

/**
 * Safely deep-merges source properties into target object.
 * Strictly prevents prototype pollution and preserves existing target fields.
 */
export function safeDeepMerge<T extends Record<string, any>>(
  target: T,
  source?: Record<string, any> | null
): T {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return target;
  }

  const result: Record<string, any> = { ...target };

  for (const key of Object.keys(source)) {
    if (FORBIDDEN_KEYS.has(key)) {
      continue;
    }

    const val = source[key];

    if (val === undefined) {
      continue;
    }

    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = safeDeepMerge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
