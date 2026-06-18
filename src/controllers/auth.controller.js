import * as AuthService from '../services/auth.service.js';

// Los controllers no necesitan try/catch. El throw se propaga al
// middleware central gracias a express-async-errors.

/**
 * POST /auth/login
 * Valida las credenciales y devuelve un Bearer Token si son correctas.
 */
export const login = (req, res) => {
  const { email, password } = req.body;

  // Campos faltantes → el handler central produce el 400.
  if (!email || !password) {
    throw { status: 400, message: 'Los campos "email" y "password" son obligatorios' };
  }

  const result = AuthService.login(email, password);
  res.status(200).json(result);
};

export default { login };
