import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Valida las credenciales del usuario y devuelve un Bearer Token si son correctas.
 * Lanza error 401 si las credenciales son inválidas.
 *
 * @param {string} email    - Email del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {{ token: string }} Token JWT firmado.
 */
export const login = (email, password) => {
  const validEmail    = process.env.ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (email !== validEmail || password !== validPassword) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const payload = { email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

  return { token };
};
