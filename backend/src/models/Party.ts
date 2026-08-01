import mongoose, { Schema, type InferSchemaType } from 'mongoose'

/** Party / Customer / Supplier — supports Mandi + live business schemas */
export const ACCOUNT_TYPES = ['trader', 'customer', 'supplier', 'expense', 'cash', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

const partySchema = new Schema(
  {
    code: { type: String, trim: true, sparse: true },
    nameUr: { type: String, default: '', trim: true },
    nameEn: { type: String, default: '', trim: true },
    /** Live API fields */
    name: { type: String, default: '', trim: true },
    nameUrdu: { type: String, default: '', trim: true },
    type: { type: String, trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    bankAccountNumber: { type: String, default: '', trim: true },
    accountType: { type: String, enum: ACCOUNT_TYPES },
    accountTypeLabel: { type: String, default: '' },
    date: { type: String, default: '' },
    commission: { type: String, default: '2%' },
    details: { type: String, default: '' },
    item: { type: String, default: '' },
    agrahi: { type: String, enum: ['NEW', 'OLD', ''], default: 'NEW' },
    openingDebit: { type: Number, default: 0 },
    openingCredit: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    balancePaisa: { type: Number },
    openingBalancePaisa: { type: Number },
    businessId: { type: Schema.Types.ObjectId },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
)

partySchema.index({ nameUr: 'text', nameEn: 'text', name: 'text', phone: 'text', code: 'text' })

export type PartyDoc = InferSchemaType<typeof partySchema> & { _id: mongoose.Types.ObjectId }
export const Party = mongoose.model('Party', partySchema)
