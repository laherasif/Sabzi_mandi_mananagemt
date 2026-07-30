import { Product } from '../models/Product';
import { Unit } from '../models/Unit';
import { ApiError } from '../utils/ApiError';
import { assertPaisa } from '../utils/money';
import { parsePagination, paginationMeta } from '../utils/pagination';

export async function listProducts(
  businessId: string,
  query: {
    page?: string;
    limit?: string;
    sort?: string;
    search?: string;
    category?: string;
    lowStock?: string;
  }
) {
  const { page, limit, skip, sort, search } = parsePagination(query);
  const filter: Record<string, unknown> = { businessId, isDeleted: false };
  if (query.category) filter.category = query.category;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { nameUrdu: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
    ];
  }
  if (query.lowStock === 'true') {
    filter.$expr = { $lte: ['$stockInBaseUnit', '$minStockAlert'] };
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('baseUnitId', 'code name nameUrdu factorToBase')
      .populate('defaultSaleUnitId', 'code name')
      .populate('defaultPurchaseUnitId', 'code name')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { items, meta: paginationMeta(total, page, limit) };
}

export async function getProduct(businessId: string, id: string) {
  const product = await Product.findOne({ _id: id, businessId, isDeleted: false })
    .populate('baseUnitId')
    .populate('defaultSaleUnitId')
    .populate('defaultPurchaseUnitId');
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function createProduct(
  businessId: string,
  userId: string,
  data: {
    sku?: string;
    name: string;
    nameUrdu?: string;
    category: 'vegetable' | 'fruit' | 'other';
    baseUnitId: string;
    defaultSaleUnitId?: string;
    defaultPurchaseUnitId?: string;
    purchaseRatePaisa: number;
    saleRatePaisa: number;
    minStockAlert: number;
    openingStockInBaseUnit?: number;
  }
) {
  const baseUnit = await Unit.findOne({ _id: data.baseUnitId, businessId, isDeleted: false });
  if (!baseUnit) throw ApiError.badRequest('Invalid base unit');

  assertPaisa(data.purchaseRatePaisa, 'purchaseRatePaisa');
  assertPaisa(data.saleRatePaisa, 'saleRatePaisa');

  try {
    return await Product.create({
      businessId,
      sku: data.sku?.toUpperCase(),
      name: data.name,
      nameUrdu: data.nameUrdu,
      category: data.category,
      baseUnitId: data.baseUnitId,
      defaultSaleUnitId: data.defaultSaleUnitId || data.baseUnitId,
      defaultPurchaseUnitId: data.defaultPurchaseUnitId || data.baseUnitId,
      purchaseRatePaisa: data.purchaseRatePaisa,
      saleRatePaisa: data.saleRatePaisa,
      minStockAlert: data.minStockAlert,
      stockInBaseUnit: data.openingStockInBaseUnit ?? 0,
      createdBy: userId,
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code: number }).code === 11000) {
      throw ApiError.conflict('SKU already exists');
    }
    throw err;
  }
}

export async function updateProduct(
  businessId: string,
  id: string,
  data: Record<string, unknown>
) {
  if (typeof data.purchaseRatePaisa === 'number') assertPaisa(data.purchaseRatePaisa, 'purchaseRatePaisa');
  if (typeof data.saleRatePaisa === 'number') assertPaisa(data.saleRatePaisa, 'saleRatePaisa');

  const product = await Product.findOneAndUpdate(
    { _id: id, businessId, isDeleted: false },
    { $set: data },
    { new: true }
  );
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function softDeleteProduct(businessId: string, id: string, userId: string) {
  const product = await Product.findOneAndUpdate(
    { _id: id, businessId, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId, isActive: false } },
    { new: true }
  );
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}
