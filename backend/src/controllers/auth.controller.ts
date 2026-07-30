import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import * as authService from '../services/auth.service';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { permissionsForRole } from '../config/roles';
import { ApiError } from '../utils/ApiError';

export const registerBusiness = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerBusiness(req.body);
  return sendCreated(
    res,
    {
      businessId: result.business.id,
      ownerId: result.owner.id,
      email: result.owner.email,
    },
    'Business registered. Please log in.'
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.login(req.body.email, req.body.password, req, res);
  return sendSuccess(res, data, 'Logged in');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.refresh(req, res);
  return sendSuccess(res, data, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req, res);
  return sendSuccess(res, null, 'Logged out');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).lean();
  if (!user || user.isDeleted) throw ApiError.unauthorized();
  const business = await Business.findById(user.businessId).lean();
  return sendSuccess(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      businessId: user.businessId,
      permissions: permissionsForRole(user.role),
    },
    business,
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('+password');
  if (!user) throw ApiError.unauthorized();
  const ok = await user.comparePassword(req.body.currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  return sendSuccess(res, null, 'Password updated');
});
