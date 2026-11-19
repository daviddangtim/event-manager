import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.ts';

const router = Router();


router.post('/login', AuthController.login);

export default router;