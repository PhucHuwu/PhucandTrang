const FORBIDDEN_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

export interface SafeDeepMergeOptions {
  /**
   * When true, an explicit `null` in the source deletes that key from the result
   * (at any depth) instead of storing `null`. Defaults to false.
   */
  nullDeletes?: boolean;
}

/**
 * Safely deep-merges source properties into target object.
 * Strictly prevents prototype pollution and preserves existing target fields.
 */
export function safeDeepMerge<T extends Record<string, any>>(
  target: T,
  source?: Record<string, any> | null,
  options: SafeDeepMergeOptions = {},
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

    if (val === null && options.nullDeletes) {
      delete result[key];
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
      result[key] = safeDeepMerge(result[key], val, options);
    } else if (
      options.nullDeletes &&
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val)
    ) {
      // Nested nulls inside a newly assigned object must not be persisted either
      result[key] = safeDeepMerge({}, val, options);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
