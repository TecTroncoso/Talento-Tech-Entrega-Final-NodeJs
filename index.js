import 'express-async-errors'; // Debe importarse antes de express para que funcione el monkey-patch en Express 4.
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import productRoutes from './src/routes/products.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import errorMiddleware from './src/middlewares/error.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Servir frontend estático

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/auth', authRoutes);

// Endpoint para ejecutar tests (Llamado desde el frontend)
app.get('/api/tests/run', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const baseUrl = `${protocol}://${host}`;

  exec('npm run test', { env: { ...process.env, BASE_URL: baseUrl } }, (error, stdout, stderr) => {
    res.json({ error: error ? error.message : null, stdout, stderr });
  });
});

// Rutas sin match → forwarder 3-arg que dispara el handler central de errores.
app.use((req, res, next) => next({ status: 404, message: 'Ruta no encontrada' }));

// Handler central de errores — DEBE registrarse al final, después de todas las rutas.
app.use(errorMiddleware);

// ─── Inicio del servidor ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}

export default app;
