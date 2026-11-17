import { Router } from 'express';
import { CheckinController } from '../controllers/checkin.controller';
import { authenticate, authorizeRoles } from '../middleware/auth';
const router = Router();


router.use(authenticate);

router.get(
  '/manifest',
  authorizeRoles('super_admin', 'registrar', 'usher'),
  CheckinController.downloadManifest
);

router.post(
  '/verify',
  authorizeRoles('super_admin', 'usher'),
  CheckinController.verifyAttendee
);


router.post(
  '/sync',
  authorizeRoles('super_admin', 'usher'),
  CheckinController.syncOfflineBatch
);

export default router;