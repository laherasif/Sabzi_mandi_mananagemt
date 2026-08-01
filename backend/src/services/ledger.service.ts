import { Party } from '../models/Party'
import { LedgerEntry } from '../models/LedgerEntry'
import { nextSeq } from '../models/Counter'
import { applyPartyBalanceDelta, partyCodeOf, partyName } from '../utils/partyHelpers'
import type { Types } from 'mongoose'

type PostInput = {
  date: string
  partyId: Types.ObjectId | string
  partyCode?: string
  invoice?: string
  source: 'sale' | 'purchase' | 'customer_purchase' | 'voucher' | 'opening' | 'manual'
  sourceId?: Types.ObjectId | string | null
  particulars?: string
  marfat?: string
  item?: string
  vehicle?: string
  pieces?: number
  rate?: number
  debit?: number
  credit?: number
}

export async function postLedger(entry: PostInput) {
  const debit = Number(entry.debit || 0)
  const credit = Number(entry.credit || 0)
  if (debit === 0 && credit === 0) return null

  const party = await Party.findById(entry.partyId)
  if (!party) return null

  const entryNo = await nextSeq('ledger_entry_no', 1)

  const doc = await LedgerEntry.create({
    date: entry.date,
    party: party._id,
    partyCode: entry.partyCode || partyCodeOf(party),
    invoice: entry.invoice || '',
    entryNo,
    source: entry.source,
    sourceId: entry.sourceId || null,
    particulars: entry.particulars || '',
    marfat: entry.marfat || '',
    item: entry.item || '',
    vehicle: entry.vehicle || '',
    pieces: entry.pieces || 0,
    rate: entry.rate || 0,
    debit,
    credit,
  })

  await applyPartyBalanceDelta(party, debit, credit)
  return doc
}

export async function removeLedgerBySource(
  source: PostInput['source'],
  sourceId: Types.ObjectId | string
) {
  const entries = await LedgerEntry.find({ source, sourceId })
  for (const e of entries) {
    const party = await Party.findById(e.party)
    if (party) {
      await applyPartyBalanceDelta(party, -Number(e.debit || 0), -Number(e.credit || 0))
    }
  }
  await LedgerEntry.deleteMany({ source, sourceId })
}

export function num(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string') {
    const n = Number(String(v).replace(/,/g, '').trim())
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

export function sumCharges(charges: Record<string, unknown> | undefined | null) {
  if (!charges) return 0
  return Object.values(charges).reduce((s: number, v) => s + num(v), 0)
}

export { partyName, partyCodeOf }
