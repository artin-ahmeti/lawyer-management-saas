export type ClassValue = string | number | bigint | boolean | null | undefined;

/** Joins truthy class names. */
export function cx(...parts: ClassValue[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}
