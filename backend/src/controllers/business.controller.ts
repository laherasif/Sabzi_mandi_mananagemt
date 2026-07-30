import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import * as businessService from '../services/business.service';
import { writeAudit } from '../middleware/audit';
import { paramId } from '../utils/params';

export const getBusiness = asyncHandler(async (req: Request, res: Response) => {
  const business = await businessService.getBusiness(req.user!.businessId);
  return sendSuccess(res, business);
});

export const updateBusiness = asyncHandler(async (req: Request, res: Response) => {
  const business = await businessService.updateBusiness(req.user!.businessId, req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'update',
    entity: 'Business',
    entityId: business.id,
    req,
  });
  return sendSuccess(res, business, 'Business updated');
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await businessService.listUsers(req.user!.businessId);
  return sendSuccess(res, users);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await businessService.createUser(req.user!.businessId, req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'create',
    entity: 'User',
    entityId: user.id,
    req,
  });
  return sendCreated(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await businessService.updateUser(req.user!.businessId, paramId(req), req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'update',
    entity: 'User',
    entityId: paramId(req),
    req,
  });
  return sendSuccess(res, user, 'User updated');
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await businessService.deactivateUser(req.user!.businessId, paramId(req));
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'delete',
    entity: 'User',
    entityId: paramId(req),
    req,
  });
  return sendSuccess(res, null, 'User deactivated');
});
