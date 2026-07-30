import { Router } from 'express';
import * as businessController from '../controllers/business.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  updateBusinessSchema,
  createUserSchema,
  updateUserSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticate);

router.get('/', authorize('settings.manage'), businessController.getBusiness);
router.patch(
  '/',
  authorize('settings.manage'),
  validate(updateBusinessSchema),
  businessController.updateBusiness
);

router.get('/users', authorize('users.manage'), businessController.listUsers);
router.post(
  '/users',
  authorize('users.manage'),
  validate(createUserSchema),
  businessController.createUser
);
router.patch(
  '/users/:id',
  authorize('users.manage'),
  validate(updateUserSchema),
  businessController.updateUser
);
router.delete('/users/:id', authorize('users.manage'), businessController.deleteUser);

export default router;
