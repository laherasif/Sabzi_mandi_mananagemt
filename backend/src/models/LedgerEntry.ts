import mongoose, { Schema, type InferSchemaType } from 'mongoose'

/**
 * Unified ledger — every bill/voucher posts here.
 * Separate collection avoids legacy Atlas indexes (businessId+entryNo).
 */
export const LEDGER_SOURCES = [
  'sale',
  'purchase',
  'customer_purchase',
  'voucher',
  'opening',
  'manual',
] as const

const ledgerEntrySchema = new Schema(
  {
    date: { type: String, required: true, index: true },
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true, index: true },
    partyCode: { type: String, default: '' },
    invoice: { type: String, default: '' },
    entryNo: { type: Number, default: 0, index: true },
    source: { type: String, enum: LEDGER_SOURCES, required: true },
    sourceId: { type: Schema.Types.ObjectId, default: null },
    particulars: { type: String, default: '' },
    marfat: { type: String, default: '' },
    item: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    pieces: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'mandi_ledger_entries' }
)

ledgerEntrySchema.index({ party: 1, date: 1 })
ledgerEntrySchema.index({ source: 1, sourceId: 1 })
ledgerEntrySchema.index({ invoice: 1 })

export type LedgerEntryDoc = InferSchemaType<typeof ledgerEntrySchema> & {
  _id: mongoose.Types.ObjectId
}
export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema)
