import { Router } from 'express';
import {
  login,
  requestAccess,
  forgotPassword,
  getDemoUsers,
  logout
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/request-access', requestAccess);
router.post('/forgot-password', forgotPassword);
router.get('/demo-users', getDemoUsers);
router.post('/logout', logout);

export default router;

