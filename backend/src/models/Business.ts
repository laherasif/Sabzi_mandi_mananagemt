import { Schema, model, Types, Document } from 'mongoose';

export interface IBusiness extends Document {
  name: string;
  nameUrdu?: string;
  phone?: string;
  address?: string;
  addressUrdu?: string;
  city?: string;
  ntn?: string;
  logoUrl?: string;
  invoicePrefix: string;
  thermalPrintWidth: 58 | 80;
  defaultLanguage: 'en' | 'ur';
  currency: 'PKR';
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>(
  {
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    addressUrdu: { type: String, trim: true },
    city: { type: String, trim: true, default: 'Lahore' },
    ntn: { type: String, trim: true },
    logoUrl: { type: String },
    invoicePrefix: { type: String, default: 'INV' },
    thermalPrintWidth: { type: Number, enum: [58, 80], default: 80 },
    defaultLanguage: { type: String, enum: ['en', 'ur'], default: 'ur' },
    currency: { type: String, default: 'PKR' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

businessSchema.index({ name: 1 });

export const Business = model<IBusiness>('Business', businessSchema);
export type BusinessId = Types.ObjectId;
