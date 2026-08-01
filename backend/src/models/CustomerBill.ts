import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const customerLineSchema = new Schema(
  {
    party: { type: Schema.Types.ObjectId, ref: 'Party', default: null },
    name: { type: String, default: '' },
    pieces: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    product: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    item: { type: String, default: '' },
    lagana: { type: Number, default: 0 },
    traderRate: { type: Number, default: 0 },
    marfat: { type: String, default: '' },
    marka: { type: String, default: '' },
    number: { type: String, default: '' },
    amount: { type: Number, default: 0 },
  },
  { _id: true }
)

const customerBillSchema = new Schema(
  {
    invoice: { type: String, required: true, unique: true, trim: true },
    date: { type: String, required: true },
    lines: { type: [customerLineSchema], default: [] },
    expense: { type: Number, default: 0 },
    lagana: { type: Number, default: 0 },
    diffAccount: { type: Number, default: 0 },
    grossAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    totalPieces: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'completed'], default: 'completed' },
  },
  { timestamps: true }
)

export type CustomerBillDoc = InferSchemaType<typeof customerBillSchema> & {
  _id: mongoose.Types.ObjectId
}
export const CustomerBill = mongoose.model('CustomerBill', customerBillSchema)
