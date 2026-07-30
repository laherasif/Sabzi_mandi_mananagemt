import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/ApiResponse';
import * as productService from '../services/product.service';
import { writeAudit } from '../middleware/audit';
import { paramId } from '../utils/params';

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.listProducts(req.user!.businessId, req.query as never);
  return sendSuccess(res, result.items, 'OK', 200, result.meta);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProduct(req.user!.businessId, paramId(req));
  return sendSuccess(res, product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.user!.businessId, req.user!.id, req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'create',
    entity: 'Product',
    entityId: product.id,
    req,
  });
  return sendCreated(res, product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.user!.businessId, paramId(req), req.body);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'update',
    entity: 'Product',
    entityId: product.id,
    req,
  });
  return sendSuccess(res, product, 'Product updated');
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.softDeleteProduct(req.user!.businessId, paramId(req), req.user!.id);
  await writeAudit({
    businessId: req.user!.businessId,
    userId: req.user!.id,
    action: 'delete',
    entity: 'Product',
    entityId: paramId(req),
    req,
  });
  return sendSuccess(res, null, 'Product deleted');
});
