import type { AccountType, Party } from './types'

/** Live API party shape (business multi-tenant backend) */
type ApiParty = {
  _id: string
  code?: string
  name?: string
  nameUrdu?: string
  nameUr?: string
  nameEn?: string
  phone?: string
  address?: string
  bankAccountNumber?: string
  type?: string
  accountType?: string
  accountTypeLabel?: string
  balance?: number
  balancePaisa?: number
  openingBalancePaisa?: number
  openingDebit?: number
  openingCredit?: number
  isActive?: boolean
  date?: string
  commission?: string
  details?: string
  item?: string
  agrahi?: 'NEW' | 'OLD' | ''
}

function mapType(t?: string): AccountType {
  if (t === 'customer' || t === 'supplier' || t === 'trader' || t === 'expense' || t === 'cash') {
    return t
  }
  return 'other'
}

function paisaToRs(paisa?: number) {
  if (paisa == null || !Number.isFinite(paisa)) return 0
  return Math.round(paisa) / 100
}

/** Normalize either backend party schema into UI Party */
export function normalizeParty(raw: ApiParty): Party {
  const accountType = mapType(raw.accountType || raw.type)
  const nameEn = raw.nameEn || raw.name || ''
  const nameUr = raw.nameUr || raw.nameUrdu || raw.name || ''
  // Prefer rupee `balance` when set; fall back to paisa (live multi-tenant schema)
  const fromBalance = Number(raw.balance || 0)
  const fromPaisa =
    raw.balancePaisa != null && Number.isFinite(Number(raw.balancePaisa))
      ? paisaToRs(Number(raw.balancePaisa))
      : null
  const balance =
    fromBalance !== 0 ? fromBalance : fromPaisa != null ? fromPaisa : 0
  const opening = paisaToRs(raw.openingBalancePaisa)

  return {
    _id: raw._id,
    code: raw.code || raw._id.slice(-6),
    nameUr,
    nameEn,
    phone: raw.phone || '',
    address: raw.address || '',
    bankAccountNumber: raw.bankAccountNumber || '',
    accountType,
    accountTypeLabel: raw.accountTypeLabel || '',
    date: raw.date || '',
    commission: raw.commission || '',
    details: raw.details || '',
    item: raw.item || '',
    agrahi: raw.agrahi || 'NEW',
    openingDebit: raw.openingDebit ?? (opening > 0 ? opening : 0),
    openingCredit: raw.openingCredit ?? (opening < 0 ? Math.abs(opening) : 0),
    balance,
    isActive: raw.isActive !== false,
  }
}

export function partyDisplayName(p: Party, lang: 'en' | 'ur' = 'ur') {
  if (lang === 'ur') return p.nameUr || p.nameEn || p.code || '—'
  return p.nameEn || p.nameUr || p.code || '—'
}
