import { Router } from 'express';
import * as unitController from '../controllers/unit.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { unitSchema, updateUnitSchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('units.read'), unitController.listUnits);
router.post('/', authorize('units.write'), validate(unitSchema), unitController.createUnit);
router.patch(
  '/:id',
  authorize('units.write'),
  validate(updateUnitSchema),
  unitController.updateUnit
);
router.delete('/:id', authorize('units.write'), unitController.deleteUnit);

export default router;
