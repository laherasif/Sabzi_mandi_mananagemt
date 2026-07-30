import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import * as partyService from '../services/party.service';
import { writeAudit } from '../middleware/audit';
import { paramId } from '../utils/params';

export const listParties = asyncHandler(async (req: Request, res: Response) => {
  const result = await partyService.listParties(req.user!.businessId, req.query as never);
  return sendSuccess(res, result.items, 'OK', 200, result.meta);
});

export const getParty = asyncHandler(async (req: Request, res: Response) => {
  const party = await partyService.getParty(req.user!.businessId, paramId(req));
  return sendSuccess(res, party);
});

export const createParty = asyncHandler(async (req: Request, res: Response) => {
  const party = await partyService.createParty(req.user!.businessId, req.user!.id, req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'create',
    entity: 'Party',
    entityId: party.id,
    req,
  });
  return sendCreated(res, party);
});

export const updateParty = asyncHandler(async (req: Request, res: Response) => {
  const party = await partyService.updateParty(req.user!.businessId, paramId(req), req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'update',
    entity: 'Party',
    entityId: party.id,
    req,
  });
  return sendSuccess(res, party, 'Party updated');
});

export const deleteParty = asyncHandler(async (req: Request, res: Response) => {
  await partyService.softDeleteParty(req.user!.businessId, paramId(req), req.user!.id);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'delete',
    entity: 'Party',
    entityId: paramId(req),
    req,
  });
  return sendSuccess(res, null, 'Party deleted');
});

export const getPartyLedger = asyncHandler(async (req: Request, res: Response) => {
  const result = await partyService.getPartyLedger(
    req.user!.businessId,
    paramId(req),
    req.query as never
  );
  return sendSuccess(res, result.items, 'OK', 200, result.meta);
});

export const getPartyBalance = asyncHandler(async (req: Request, res: Response) => {
  const party = await partyService.getParty(req.user!.businessId, paramId(req));
  return sendSuccess(res, {
    partyId: party.id,
    balancePaisa: party.balancePaisa,
    openingBalancePaisa: party.openingBalancePaisa,
  });
});
