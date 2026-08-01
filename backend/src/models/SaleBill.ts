import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const chargeSchema = new Schema(
  {
    commission: { type: Number, default: 0 },
    fare: { type: Number, default: 0 },
    expense: { type: Number, default: 0 },
    labor: { type: Number, default: 0 },
    market: { type: Number, default: 0 },
    munshiana: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    store: { type: Number, default: 0 },
    cashBill: { type: Number, default: 0 },
    payment: { type: Number, default: 0 },
  },
  { _id: false }
)

const saleLineSchema = new Schema(
  {
    party: { type: Schema.Types.ObjectId, ref: 'Party', default: null },
    name: { type: String, default: '' },
    pieces: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    item: { type: String, default: '' },
    lagana: { type: Number, default: 0 },
    traderRate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: true }
)

const saleBillSchema = new Schema(
  {
    invoice: { type: String, required: true, unique: true, trim: true },
    date: { type: String, required: true },
    landowner: { type: String, default: '' },
    landownerParty: { type: Schema.Types.ObjectId, ref: 'Party', default: null },
    marfat: { type: Schema.Types.ObjectId, ref: 'Marfat', default: null },
    marfatName: { type: String, default: '' },
    item: { type: String, default: '' },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    marka: { type: String, default: '' },
    vehicle: { type: String, default: '' },
    totalNag: { type: Number, default: 0 },
    lines: { type: [saleLineSchema], default: [] },
    charges: { type: chargeSchema, default: () => ({}) },
    lagana: { type: Number, default: 0 },
    diffAccount: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'completed'], default: 'completed' },
  },
  { timestamps: true }
)

saleBillSchema.index({ date: 1 })
saleBillSchema.index({ landowner: 1 })

export type SaleBillDoc = InferSchemaType<typeof saleBillSchema> & { _id: mongoose.Types.ObjectId }
export const SaleBill = mongoose.model('SaleBill', saleBillSchema)
