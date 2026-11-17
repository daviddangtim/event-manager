import { Router } from 'express';
import { AttendeeController } from '../controllers/attendee.controller';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();


router.use(authenticate);

// Only Super Admins and Registrars can pre-register attendees
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