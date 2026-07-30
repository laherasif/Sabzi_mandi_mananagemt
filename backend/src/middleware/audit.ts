import { NextFunction, Request, Response } from 'express';
import { AuditAction, AuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';

export async function writeAudit(params: {
  businessId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  action: AuditAction;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  req?: Request;
}) {
  try {
    await AuditLog.create({
      businessId: params.businessId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      meta: params.meta,
      ip: params.req?.ip,
      userAgent: params.req?.get('user-agent'),
    });
  } catch (err) {
    console.error('Audit log failed', err);
  }
}

/** Fire-and-forget audit helper for controllers. */
export function audit(
  action: AuditAction,
  entity: string,
  getEntityId?: (req: Request, res: Response) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode < 400 && req.user) {
        void writeAudit({
          businessId: req.user.businessId,
          userId: req.user.id,
          action,
          entity,
          entityId: getEntityId?.(req, res),
          req,
        });
      }
      return originalJson(body);
    };
    next();
  };
}
