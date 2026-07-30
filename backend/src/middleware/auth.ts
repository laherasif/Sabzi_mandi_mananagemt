import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/tokens';
import { User } from '../models/User';
import { Permission, Role, hasPermission } from '../config/roles';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      businessId: string;
      role: Role;
      name: string;
      email: string;
    }
    interface Request {
      user?: UserPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw ApiError.unauthorized('Access token required');

    const payload = verifyAccessToken(token);
    const user = await User.findOne({
      _id: payload.sub,
      businessId: payload.businessId,
      isDeleted: false,
      isActive: true,
    });

    if (!user) throw ApiError.unauthorized('User not found or inactive');

    req.user = {
      id: user.id,
      businessId: String(user.businessId),
      role: user.role,
      name: user.name,
      email: user.email,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

export function authorize(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    const ok = permissions.every((p) => hasPermission(req.user!.role, p));
    if (!ok) return next(ApiError.forbidden('Insufficient permissions'));
    next();
  };
}
