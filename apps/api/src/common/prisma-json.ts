import { Prisma } from '@prisma/client';

/**
 * Prisma rejects a plain JS `null` for Json columns. For nullable Json columns
 * (PageElement.style / interaction, Book.publishedSnapshot, ...) a `null` must become
 * `Prisma.DbNull` (SQL NULL). `undefined` is kept so the field is left untouched.
 */
export function nullableJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

/**
 * Required Json columns (Page.background, PageElement.transform / data, Book.cover / settings)
 * can never be NULL: missing or null values fall back to `{}` (or the given fallback).
 */
export function requiredJson(
  value: unknown,
  fallback: Prisma.InputJsonValue = {},
): Prisma.InputJsonValue {
  if (value === undefined || value === null) return fallback;
  return value as Prisma.InputJsonValue;
}
