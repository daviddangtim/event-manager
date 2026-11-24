import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.ts';
import { AuthController } from '../controllers/auth.controller.ts';

const router = Router();


router.post('/login', AuthController.login);

router.post(
  '/register',
  authenticate,
  authorizeRoles('super_admin'),
  AuthController.registerStaff
)

export default router;