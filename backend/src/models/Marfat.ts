import mongoose, { Schema, type InferSchemaType } from 'mongoose'

/** معرفت — links landowner (زمیندار) with marfat name */
const marfatSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    landownerUr: { type: String, default: '', trim: true },
    landownerEn: { type: String, default: '', trim: true },
    marfatUr: { type: String, required: true, trim: true },
    marfatEn: { type: String, default: '', trim: true },
    /** Optional link to a Party (landowner account) */
    landownerParty: { type: Schema.Types.ObjectId, ref: 'Party', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export type MarfatDoc = InferSchemaType<typeof marfatSchema> & { _id: mongoose.Types.ObjectId }
export const Marfat = mongoose.model('Marfat', marfatSchema)
