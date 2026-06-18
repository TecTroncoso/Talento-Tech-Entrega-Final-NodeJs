import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller.js';

const router = Router();

// Ruta pública: login no requiere autenticación previa
router.post('/login', AuthController.login);

export default router;
