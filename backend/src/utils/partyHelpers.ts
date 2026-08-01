import type { Types } from 'mongoose'

/** Works with both Mandi Party schema and live business Party docs */
export type AnyParty = {
  _id: Types.ObjectId | string
  code?: string | null
  nameUr?: string | null
  nameEn?: string | null
  name?: string | null
  nameUrdu?: string | null
  balance?: number | null
  balancePaisa?: number | null
  save?: () => Promise<unknown>
}

export function partyName(p: AnyParty | null | undefined) {
  if (!p) return ''
  return p.nameUr || p.nameEn || p.nameUrdu || p.name || ''
}

export function partyCodeOf(p: AnyParty | null | undefined) {
  if (!p) return ''
  if (p.code) return p.code
  return String(p._id).slice(-6).toUpperCase()
}

export async function applyPartyBalanceDelta(party: AnyParty, debit: number, credit: number) {
  const delta = Number(debit || 0) - Number(credit || 0)
  if (!delta || typeof party.save !== 'function') return

  // Keep both rupee + paisa in sync (UI may read either field)
  party.balance = Number(party.balance || 0) + delta
  party.balancePaisa = Number(party.balancePaisa || 0) + Math.round(delta * 100)
  await party.save()
}
