/** Money helpers — amounts from API are integer paisa. */

export function paisaToPkr(paisa: number): number {
  return Math.trunc(paisa) / 100
}

export function pkrToPaisa(pkr: number): number {
  return Math.round(pkr * 100)
}

export function formatPkr(paisa: number, locale = 'en-PK'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paisaToPkr(paisa))
}
