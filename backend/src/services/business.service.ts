import { Business } from '../models/Business';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { Role } from '../config/roles';

export async function getBusiness(businessId: string) {
  const business = await Business.findOne({ _id: businessId, isDeleted: false });
  if (!business) throw ApiError.notFound('Business not found');
  return business;
}

export async function updateBusiness(businessId: string, data: Record<string, unknown>) {
  const business = await Business.findOneAndUpdate(
    { _id: businessId, isDeleted: false },
    { $set: data },
    { new: true }
  );
  if (!business) throw ApiError.notFound('Business not found');
  return business;
}

export async function listUsers(businessId: string) {
  return User.find({ businessId, isDeleted: false })
    .select('-password')
    .sort({ createdAt: 1 })
    .lean();
}

export async function createUser(
  businessId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: Role;
  }
) {
  if (data.role === 'owner') throw ApiError.badRequest('Cannot create another owner');
  const exists = await User.findOne({ email: data.email.toLowerCase() });
  if (exists) throw ApiError.conflict('Email already in use');

  return User.create({
    businessId,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    password: data.password,
    role: data.role,
  });
}

export async function updateUser(
  businessId: string,
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    role: Role;
    isActive: boolean;
    password: string;
  }>
) {
  const user = await User.findOne({ _id: id, businessId, isDeleted: false }).select('+password');
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'owner' && data.role && data.role !== 'owner') {
    throw ApiError.badRequest('Cannot change owner role');
  }
  if (data.name) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.role && user.role !== 'owner') user.role = data.role;
  if (typeof data.isActive === 'boolean' && user.role !== 'owner') user.isActive = data.isActive;
  if (data.password) user.password = data.password;
  await user.save();
  const obj = user.toObject();
  delete (obj as { password?: string }).password;
  return obj;
}

export async function deactivateUser(businessId: string, id: string) {
  const user = await User.findOne({ _id: id, businessId, isDeleted: false });
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'owner') throw ApiError.badRequest('Cannot deactivate owner');
  user.isActive = false;
  user.isDeleted = true;
  user.deletedAt = new Date();
  await user.save();
  return user;
}
