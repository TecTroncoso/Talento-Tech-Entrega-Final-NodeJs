import { Router } from 'express';
import * as ProductController from '../controllers/products.controller.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { productCreateSchema } from '../validators/products.schema.js';

const router = Router();

// Todas las rutas de productos requieren autenticación
router.get('/',         authMiddleware, ProductController.getAll);
router.get('/:id',      authMiddleware, ProductController.getById);
// POST /create: auth → validación Zod → controller.
router.post('/create',  authMiddleware, validate(productCreateSchema), ProductController.create);
// PUT /:id: auth → validación partial (todos los campos opcionales) → controller.
router.put('/:id',      authMiddleware, validate(productCreateSchema.partial()), ProductController.update);
router.delete('/:id',   authMiddleware, ProductController.remove);

export default router;
