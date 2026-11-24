import { Router } from 'express';
import { AttendeeController } from '../controllers/attendee.controller.ts';
import { authenticate, authorizeRoles } from '../middleware/auth.ts';

const router = Router();


router.use(authenticate);

router.post(
  '/',
  authorizeRoles('super_admin', 'registrar'),
  AttendeeController.registerAttendee
);


router.post(
  '/batch',
  authorizeRoles('super_admin', 'registrar'),
  AttendeeController.bulkRegisterAttendees
);


router.get(
  '/',
  authorizeRoles('super_admin', 'registrar', 'usher'),
  AttendeeController.getAllAttendees
);

export default router;