import { Request } from 'express';
import { ApiError } from './ApiError';

/** Express 5 params can be string | string[] — normalize to a single id. */
export function paramId(req: Request, name = 'id'): string {
  const value = req.params[name];
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw ApiError.badRequest(`Missing route param: ${name}`);
  return id;
}
