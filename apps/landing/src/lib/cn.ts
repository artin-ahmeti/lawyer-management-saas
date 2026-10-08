export type ClassValue = string | false | null | undefined;

/** Joins truthy class names. */
export const cn = (...parts: ClassValue[]): string => parts.filter(Boolean).join(' ');
