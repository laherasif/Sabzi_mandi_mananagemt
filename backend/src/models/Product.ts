import { Schema, model, Types, Document } from 'mongoose';

export const PRODUCT_CATEGORIES = ['vegetable', 'fruit', 'other'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface IProduct extends Document {
  businessId: Types.ObjectId;
  sku?: string;
  name: string;
  nameUrdu?: string;
  category: ProductCategory;
  baseUnitId: Types.ObjectId;
  defaultSaleUnitId?: Types.ObjectId;
  defaultPurchaseUnitId?: Types.ObjectId;
  /** Rates in paisa per base unit (KG). */
  purchaseRatePaisa: number;
  saleRatePaisa: number;
  /** Current stock in base unit (KG). Decimal-friendly via Number; qty tracked carefully. */
  stockInBaseUnit: number;
  minStockAlert: number;
  wastageInBaseUnit: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    sku: { type: String, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    nameUrdu: { type: String, trim: true },
    category: { type: String, enum: PRODUCT_CATEGORIES, default: 'vegetable', index: true },
    baseUnitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    defaultSaleUnitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    defaultPurchaseUnitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    purchaseRatePaisa: { type: Number, default: 0 },
    saleRatePaisa: { type: Number, default: 0 },
    stockInBaseUnit: { type: Number, default: 0 },
    minStockAlert: { type: Number, default: 0 },
    wastageInBaseUnit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productSchema.index({ businessId: 1, name: 1 });
productSchema.index({ businessId: 1, sku: 1 }, { unique: true, sparse: true });
productSchema.index({ businessId: 1, isDeleted: 1, name: 'text', nameUrdu: 'text' });

export const Product = model<IProduct>('Product', productSchema);
