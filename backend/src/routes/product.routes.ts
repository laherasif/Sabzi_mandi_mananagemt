import { Router } from 'express';
import * as productController from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { productSchema, updateProductSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('products.read'), productController.listProducts);
router.post(
  '/',
  authorize('products.write'),
  validate(productSchema),
  productController.createProduct
);
router.get('/:id', authorize('products.read'), productController.getProduct);
router.patch(
  '/:id',
  authorize('products.write'),
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete('/:id', authorize('products.write'), productController.deleteProduct);

export default router;
