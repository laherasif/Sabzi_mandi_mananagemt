import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import * as unitService from '../services/unit.service';
import { writeAudit } from '../middleware/audit';
import { paramId } from '../utils/params';

export const listUnits = asyncHandler(async (req: Request, res: Response) => {
  const units = await unitService.listUnits(req.user!.businessId);
  return sendSuccess(res, units);
});

export const createUnit = asyncHandler(async (req: Request, res: Response) => {
  const unit = await unitService.createUnit(req.user!.businessId, req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'create',
    entity: 'Unit',
    entityId: unit.id,
    req,
  });
  return sendCreated(res, unit);
});

export const updateUnit = asyncHandler(async (req: Request, res: Response) => {
  const unit = await unitService.updateUnit(req.user!.businessId, paramId(req), req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'update',
    entity: 'Unit',
    entityId: unit.id,
    req,
  });
  return sendSuccess(res, unit, 'Unit updated');
});

export const deleteUnit = asyncHandler(async (req: Request, res: Response) => {
  await unitService.softDeleteUnit(req.user!.businessId, paramId(req));
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'delete',
    entity: 'Unit',
    entityId: paramId(req),
    req,
  });
  return sendSuccess(res, null, 'Unit deleted');
});
