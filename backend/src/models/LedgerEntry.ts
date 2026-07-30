import { Schema, model, Types, Document } from 'mongoose';

/**
 * Immutable financial ledger entry.
 * Never update amounts after insert — cancel via reversal entry.
 */
export const LEDGER_REF_TYPES = [
  'opening',
  'sale',
  'purchase',
  'payment',
  'expense',
  'adjustment',
  'reversal',
] as const;
export type LedgerRefType = (typeof LEDGER_REF_TYPES)[number];

export interface ILedgerEntry extends Document {
  businessId: Types.ObjectId;
  partyId: Types.ObjectId;
  date: Date;
  entryNo: string;
  refType: LedgerRefType;
  refId?: Types.ObjectId;
  description: string;
  debitPaisa: number;
  creditPaisa: number;
  /** Snapshot of running balance after this entry (party owes us if positive). */
  balanceAfterPaisa: number;
  reversesEntryId?: Types.ObjectId;
  reversedByEntryId?: Types.ObjectId;
  isReversed: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    partyId: { type: Schema.Types.ObjectId, ref: 'Party', required: true, index: true },
    date: { type: Date, required: true, index: true },
    entryNo: { type: String, required: true },
    refType: { type: String, enum: LEDGER_REF_TYPES, required: true },
    refId: { type: Schema.Types.ObjectId },
    description: { type: String, required: true },
    debitPaisa: { type: Number, required: true, default: 0 },
    creditPaisa: { type: Number, required: true, default: 0 },
    balanceAfterPaisa: { type: Number, required: true },
    reversesEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    reversedByEntryId: { type: Schema.Types.ObjectId, ref: 'LedgerEntry' },
    isReversed: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ledgerEntrySchema.index({ businessId: 1, partyId: 1, date: 1, createdAt: 1 });
ledgerEntrySchema.index({ businessId: 1, entryNo: 1 }, { unique: true });

// Block updates to money fields (immutability guard)
ledgerEntrySchema.pre('findOneAndUpdate', function () {
  throw new Error('Ledger entries are immutable. Use a reversal entry instead.');
});

export const LedgerEntry = model<ILedgerEntry>('LedgerEntry', ledgerEntrySchema);
