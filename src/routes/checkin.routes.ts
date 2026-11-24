import { Router } from 'express';
import { CheckinController } from '../controllers/checkin.controller.ts';
import { authenticate, authorizeRoles } from '../middleware/auth.ts';
const router = Router();


router.use(authenticate);

router.get(
  '/manifest',
  authorizeRoles('super_admin', 'registrar', 'usher'),
  CheckinController.downloadManifest
);

router.post(
  '/verify',
  authorizeRoles('super_admin','registrar', 'usher'),
  CheckinController.verifyAttendee
);


router.post(
  '/sync',
  authorizeRoles('super_admin', 'usher'),
  CheckinController.syncOfflineBatch
);

export default router;