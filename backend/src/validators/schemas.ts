import { z } from 'zod';
import { PARTY_TYPES } from '../models/Party';
import { PRODUCT_CATEGORIES } from '../models/Product';

const paisa = z.number().int('Amount must be integer paisa');

export const registerBusinessSchema = z.object({
  businessName: z.string().min(2).max(120),
  businessNameUrdu: z.string().max(120).optional(),
  phone: z.string().min(10).max(20).optional(),
  city: z.string().max(80).optional(),
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(72),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  nameUrdu: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(250).optional(),
  addressUrdu: z.string().max(250).optional(),
  city: z.string().max(80).optional(),
  ntn: z.string().max(50).optional(),
  invoicePrefix: z.string().min(1).max(10).optional(),
  thermalPrintWidth: z.union([z.literal(58), z.literal(80)]).optional(),
  defaultLanguage: z.enum(['en', 'ur']).optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  password: z.string().min(6).max(72),
  role: z.enum(['admin', 'accountant', 'salesman', 'viewer']),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(['admin', 'accountant', 'salesman', 'viewer']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).max(72).optional(),
});

export const unitSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(60),
  nameUrdu: z.string().max(60).optional(),
  factorToBase: z.number().positive(),
  isBase: z.boolean().optional(),
});

export const updateUnitSchema = unitSchema.partial();

export const partySchema = z.object({
  type: z.enum(PARTY_TYPES),
  name: z.string().min(2).max(120),
  nameUrdu: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  phoneAlt: z.string().max(20).optional(),
  address: z.string().max(250).optional(),
  city: z.string().max(80).optional(),
  cnic: z.string().max(20).optional(),
  openingBalancePaisa: paisa.optional().default(0),
  creditLimitPaisa: paisa.optional().default(0),
  notes: z.string().max(500).optional(),
});

export const updatePartySchema = partySchema
  .omit({ type: true, openingBalancePaisa: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const productSchema = z.object({
  sku: z.string().max(40).optional(),
  name: z.string().min(1).max(120),
  nameUrdu: z.string().max(120).optional(),
  category: z.enum(PRODUCT_CATEGORIES).default('vegetable'),
  baseUnitId: z.string().min(1),
  defaultSaleUnitId: z.string().optional(),
  defaultPurchaseUnitId: z.string().optional(),
  purchaseRatePaisa: paisa.default(0),
  saleRatePaisa: paisa.default(0),
  minStockAlert: z.number().min(0).default(0),
  openingStockInBaseUnit: z.number().min(0).optional().default(0),
});

export const updateProductSchema = productSchema
  .omit({ openingStockInBaseUnit: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });
