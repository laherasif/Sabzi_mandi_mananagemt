import { Schema, model, Types, Document } from 'mongoose';

/**
 * Unit of measure with conversion to base unit (KG).
 * Example: Mann = 40 KG → factorToBase = 40
 */
export interface IUnit extends Document {
  businessId: Types.ObjectId;
  code: string;
  name: string;
  nameUrdu?: string;
  /** Multiply qty in this unit by factorToBase to get KG (or base). */
  factorToBase: number;
  isBase: boolean;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<IUnit>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, trim: true },
    factorToBase: { type: Number, required: true, min: 0.0001 },
    isBase: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

unitSchema.index({ businessId: 1, code: 1 }, { unique: true });

export const Unit = model<IUnit>('Unit', unitSchema);
