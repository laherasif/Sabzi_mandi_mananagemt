import { Unit } from '../models/Unit';
import { ApiError } from '../utils/ApiError';

export async function listUnits(businessId: string) {
  return Unit.find({ businessId, isDeleted: false }).sort({ isBase: -1, name: 1 }).lean();
}

export async function createUnit(
  businessId: string,
  data: {
    code: string;
    name: string;
    nameUrdu?: string;
    factorToBase: number;
    isBase?: boolean;
  }
) {
  if (data.isBase) {
    await Unit.updateMany({ businessId, isBase: true }, { $set: { isBase: false } });
  }
  try {
    return await Unit.create({
      businessId,
      code: data.code.toUpperCase(),
      name: data.name,
      nameUrdu: data.nameUrdu,
      factorToBase: data.factorToBase,
      isBase: data.isBase ?? false,
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code: number }).code === 11000) {
      throw ApiError.conflict('Unit code already exists');
    }
    throw err;
  }
}

export async function updateUnit(
  businessId: string,
  id: string,
  data: Partial<{
    code: string;
    name: string;
    nameUrdu: string;
    factorToBase: number;
    isBase: boolean;
  }>
) {
  if (data.isBase) {
    await Unit.updateMany({ businessId, isBase: true }, { $set: { isBase: false } });
  }
  const unit = await Unit.findOneAndUpdate(
    { _id: id, businessId, isDeleted: false },
    {
      $set: {
        ...data,
        ...(data.code ? { code: data.code.toUpperCase() } : {}),
      },
    },
    { new: true }
  );
  if (!unit) throw ApiError.notFound('Unit not found');
  return unit;
}

export async function softDeleteUnit(businessId: string, id: string) {
  const unit = await Unit.findOne({ _id: id, businessId, isDeleted: false });
  if (!unit) throw ApiError.notFound('Unit not found');
  if (unit.isBase) throw ApiError.badRequest('Cannot delete the base unit');
  unit.isDeleted = true;
  unit.deletedAt = new Date();
  unit.isActive = false;
  await unit.save();
  return unit;
}
