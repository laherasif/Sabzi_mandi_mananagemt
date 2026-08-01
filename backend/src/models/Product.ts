import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const productSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    nameUr: { type: String, default: '', trim: true },
    nameEn: { type: String, default: '', trim: true },
    commission: { type: String, default: '2%' },
    labor: { type: String, default: '' },
    market: { type: String, default: '' },
    munshiana: { type: String, default: '' },
    fare: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: mongoose.Types.ObjectId }
export const Product = mongoose.model('Product', productSchema)
