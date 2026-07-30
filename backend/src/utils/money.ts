/**
 * Money helpers — all amounts are integer paisa (1 PKR = 100 paisa).
 * Never use floating-point arithmetic for money.
 */

export const PAISA_PER_PKR = 100;

/** Convert PKR (may be decimal string/number) to integer paisa. */
export function pkrToPaisa(pkr: number | string): number {
  const n = typeof pkr === 'string' ? Number(pkr) : pkr;
  if (!Number.isFinite(n)) throw new Error('Invalid PKR amount');
  return Math.round(n * PAISA_PER_PKR);
}

/** Convert integer paisa to PKR number (for display serialization). */
export function paisaToPkr(paisa: number): number {
  return Math.trunc(paisa) / PAISA_PER_PKR;
}

/** Format paisa as Pakistani Rupees string e.g. "Rs 1,250.50" */
export function formatPkr(paisa: number, locale = 'en-PK'): string {
  const amount = paisaToPkr(Math.trunc(paisa));
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Safe integer addition for paisa. */
export function addPaisa(...values: number[]): number {
  return values.reduce((sum, v) => sum + Math.trunc(v), 0);
}

/** Multiply quantity × rate (paisa), half-up to nearest paisa. */
export function multiplyToPaisa(quantity: number, ratePaisa: number): number {
  // Use integer math where possible; quantity may have decimals (kg)
  return Math.round(quantity * Math.trunc(ratePaisa));
}

export function assertPaisa(value: number, field = 'amount'): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer (paisa)`);
  }
  return value;
}
