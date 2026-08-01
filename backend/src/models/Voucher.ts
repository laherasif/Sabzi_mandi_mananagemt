import mongoose, { Schema, type InferSchemaType } from 'mongoose'

/** بنام / جمع / وصولی vouchers */
export const VOUCHER_TYPES = ['debit', 'credit', 'recovery'] as const
export type VoucherType = (typeof VOUCHER_TYPES)[number]

const voucherSchema = new Schema(
  {
    invoice: { type: String, required: true, unique: true, trim: true },
    date: { type: String, required: true },
    type: { type: String, enum: VOUCHER_TYPES, required: true, index: true },
    party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
    partyCode: { type: String, default: '' },
    partyName: { type: String, default: '' },
    cashAccount: { type: String, default: 'نقدی کھاتہ' },
    details: { type: String, default: '' },
    marfat: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    bank: { type: String, default: '' },
  },
  { timestamps: true }
)

voucherSchema.index({ date: 1, type: 1 })

export type VoucherDoc = InferSchemaType<typeof voucherSchema> & { _id: mongoose.Types.ObjectId }
export const Voucher = mongoose.model('Voucher', voucherSchema)
