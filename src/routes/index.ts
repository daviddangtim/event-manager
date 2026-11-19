import { Router } from 'express';
import authRoutes from './auth.routes.ts';
import attendeeRoutes from './attendee.routes.ts';
import checkinRoutes from './checkin.routes.ts';

const router = Router();


router.use('/auth', authRoutes);
router.use('/attendees', attendeeRoutes);
router.use('/checkins', checkinRoutes);

export default router;