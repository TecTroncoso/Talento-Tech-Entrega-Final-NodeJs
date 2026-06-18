import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware de autenticación JWT.
 *
 * Verifica que la petición incluya un Bearer Token válido en el header
 * Authorization. Las condiciones de error se delegan al middleware
 * central mediante `next({ status, message })`. El middleware
 * NO escribe la respuesta directamente.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Token ausente → 401 vía next(err). El middleware central formatea.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next({ status: 401, message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Token expirado → 403 vía next(err).
    if (err.name === 'TokenExpiredError') {
      return next({ status: 403, message: 'El token ha expirado' });
    }
    // Token inválido (firma incorrecta, malformado) → 403 vía next(err).
    return next({ status: 403, message: 'Token inválido' });
  }
};

export default authMiddleware;
