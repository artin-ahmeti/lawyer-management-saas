/**
 * Monetary values are integer cents end-to-end in application code and
 * numeric(19,4) in Postgres. Never floats. (Plan §5)
 */
export type Cents = number;

export function addCents(a: Cents, b: Cents): Cents {
  assertCents(a);
  assertCents(b);
  return a + b;
}

/** Round half-up to whole cents — the convention for client-facing invoice math. */
export function multiplyCents(amount: Cents, factor: number): Cents {
  assertCents(amount);
  return Math.round(amount * factor);
}

export function formatCents(amount: Cents, currency = 'USD', locale = 'en-US'): string {
  assertCents(amount);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);
}

function assertCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Monetary amount must be integer cents, got: ${value}`);
  }
}
