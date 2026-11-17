import { Router } from 'express';
import authRoutes from './auth.routes';
import attendeeRoutes from './attendee.routes';
import checkinRoutes from './checkin.routes';

const router = Router();


router.use('/auth', authRoutes);
router.use('/attendees', attendeeRoutes);
router.use('/checkins', checkinRoutes);

export default router;