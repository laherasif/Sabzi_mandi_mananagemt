import { Router } from 'express';
import * as partyController from '../controllers/party.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { partySchema, updatePartySchema } from '../validators/schemas';

const router = Router();
router.use(authenticate);

router.get('/', authorize('parties.read'), partyController.listParties);
router.post('/', authorize('parties.write'), validate(partySchema), partyController.createParty);
router.get('/:id', authorize('parties.read'), partyController.getParty);
router.patch(
  '/:id',
  authorize('parties.write'),
  validate(updatePartySchema),
  partyController.updateParty
);
router.delete('/:id', authorize('parties.write'), partyController.deleteParty);
router.get('/:id/ledger', authorize('ledger.read'), partyController.getPartyLedger);
router.get('/:id/balance', authorize('parties.read'), partyController.getPartyBalance);

export default router;
