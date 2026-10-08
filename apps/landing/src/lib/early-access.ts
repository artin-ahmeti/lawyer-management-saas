/**
 * Shared by the form (client) and the route handler (server). No validation
 * library here, so zod never reaches the browser bundle; the schema lives
 * next to the route in src/app/api/early-access/schema.ts.
 */
export const FIRM_SIZES = ['Solo', '2–5 lawyers', '6–20 lawyers', '21+ lawyers'] as const;

export type EarlyAccessField = 'name' | 'email' | 'firm' | 'firmSize' | 'message' | 'website';

export type EarlyAccessResult =
  | { status: 'received' }
  | { status: 'not-configured' }
  | { status: 'invalid'; fieldErrors: Partial<Record<EarlyAccessField, string>> }
  | { status: 'error' };
