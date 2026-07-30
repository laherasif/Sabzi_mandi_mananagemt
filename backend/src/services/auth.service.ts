import crypto from 'crypto';
import { Response } from 'express';
import { Types } from 'mongoose';
import { Business } from '../models/Business';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { Unit } from '../models/Unit';
import { ApiError } from '../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';
import { permissionsForRole } from '../config/roles';
import { env } from '../config/env';
import { writeAudit } from '../middleware/audit';
import { Request } from 'express';

const DEFAULT_UNITS = [
  { code: 'KG', name: 'Kilogram', nameUrdu: 'کلو', factorToBase: 1, isBase: true },
  { code: 'MANN', name: 'Mann', nameUrdu: 'من', factorToBase: 40, isBase: false },
  { code: 'BORI', name: 'Bori', nameUrdu: 'بوری', factorToBase: 50, isBase: false },
  { code: 'PETI', name: 'Peti', nameUrdu: 'پیٹی', factorToBase: 20, isBase: false },
  { code: 'TOKRI', name: 'Tokri', nameUrdu: 'ٹوکری', factorToBase: 15, isBase: false },
  { code: 'DOZEN', name: 'Dozen', nameUrdu: 'درجن', factorToBase: 1, isBase: false },
];

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function registerBusiness(input: {
  businessName: string;
  businessNameUrdu?: string;
  phone?: string;
  city?: string;
  ownerName: string;
  email: string;
  password: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw ApiError.conflict('Email already registered');

  const business = await Business.create({
    name: input.businessName,
    nameUrdu: input.businessNameUrdu,
    phone: input.phone,
    city: input.city || 'Lahore',
  });

  const owner = await User.create({
    businessId: business._id,
    name: input.ownerName,
    email: input.email.toLowerCase(),
    password: input.password,
    role: 'owner',
  });

  await Unit.insertMany(
    DEFAULT_UNITS.map((u) => ({ ...u, businessId: business._id }))
  );

  return { business, owner };
}

export async function login(
  email: string,
  password: string,
  req: Request,
  res: Response
) {
  const user = await User.findOne({
    email: email.toLowerCase(),
    isDeleted: false,
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');

  const business = await Business.findOne({ _id: user.businessId, isDeleted: false, isActive: true });
  if (!business) throw ApiError.forbidden('Business is inactive');

  user.lastLoginAt = new Date();
  await user.save();

  const tokenId = new Types.ObjectId().toString();
  const refreshToken = signRefreshToken({
    sub: user.id,
    businessId: String(user.businessId),
    tokenId,
  });

  await RefreshToken.create({
    _id: tokenId,
    userId: user._id,
    businessId: user.businessId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  const accessToken = signAccessToken({
    sub: user.id,
    businessId: String(user.businessId),
    role: user.role,
  });

  setRefreshCookie(res, refreshToken);

  await writeAudit({
    businessId: user.businessId,
    userId: user._id,
    action: 'login',
    entity: 'User',
    entityId: user.id,
    req,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: String(user.businessId),
      permissions: permissionsForRole(user.role),
    },
    business: {
      id: business.id,
      name: business.name,
      nameUrdu: business.nameUrdu,
      defaultLanguage: business.defaultLanguage,
    },
  };
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw ApiError.unauthorized('Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const stored = await RefreshToken.findOne({
    _id: payload.tokenId,
    userId: payload.sub,
    revokedAt: { $exists: false },
  });
  if (!stored || stored.tokenHash !== hashToken(token)) {
    throw ApiError.unauthorized('Refresh token revoked');
  }

  const user = await User.findOne({ _id: payload.sub, isDeleted: false, isActive: true });
  if (!user) throw ApiError.unauthorized('User not found');

  // Rotate refresh token
  stored.revokedAt = new Date();
  await stored.save();

  const tokenId = new Types.ObjectId().toString();
  const newRefresh = signRefreshToken({
    sub: user.id,
    businessId: String(user.businessId),
    tokenId,
  });
  await RefreshToken.create({
    _id: tokenId,
    userId: user._id,
    businessId: user.businessId,
    tokenHash: hashToken(newRefresh),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });
  setRefreshCookie(res, newRefresh);

  const accessToken = signAccessToken({
    sub: user.id,
    businessId: String(user.businessId),
    role: user.role,
  });

  return { accessToken };
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.refreshToken as string | undefined;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await RefreshToken.updateOne(
        { _id: payload.tokenId },
        { $set: { revokedAt: new Date() } }
      );
    } catch {
      /* ignore */
    }
  }
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  if (req.user) {
    await writeAudit({
      businessId: req.user.businessId,
      userId: req.user.id,
      action: 'logout',
      entity: 'User',
      entityId: req.user.id,
      req,
    });
  }
}
