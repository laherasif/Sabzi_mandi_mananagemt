import { Schema, model, Types, Document } from 'mongoose';

export const PARTY_TYPES = ['customer', 'supplier', 'agent', 'transporter', 'labour'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export interface IParty extends Document {
  businessId: Types.ObjectId;
  type: PartyType;
  name: string;
  nameUrdu?: string;
  phone?: string;
  phoneAlt?: string;
  address?: string;
  city?: string;
  cnic?: string;
  /** Opening balance in paisa. Positive = receivable (they owe us). */
  openingBalancePaisa: number;
  openingBalanceLocked: boolean;
  /** Cached running balance in paisa (party owes us if positive). */
  balancePaisa: number;
  creditLimitPaisa: number;
  notes?: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const partySchema = new Schema<IParty>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    type: { type: String, enum: PARTY_TYPES, required: true, index: true },
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, trim: true },
    phone: { type: String, trim: true },
    phoneAlt: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    cnic: { type: String, trim: true },
    openingBalancePaisa: { type: Number, default: 0 },
    openingBalanceLocked: { type: Boolean, default: false },
    balancePaisa: { type: Number, default: 0 },
    creditLimitPaisa: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

partySchema.index({ businessId: 1, type: 1, name: 1 });
partySchema.index({ businessId: 1, phone: 1 });
partySchema.index({ businessId: 1, isDeleted: 1, name: 'text', nameUrdu: 'text' });

export const Party = model<IParty>('Party', partySchema);
