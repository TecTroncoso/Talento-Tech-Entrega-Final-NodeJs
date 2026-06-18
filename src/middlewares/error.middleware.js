import { ZodError } from 'zod';

/**
 * Middleware central de manejo de errores.
 *
 * Es el único punto que produce respuestas 4xx/5xx de la API.
 * Los controllers y services no necesitan try/catch de shaping:
 * lanzan errores con { status, message } o dejan que las promesas
 * se propaguen (express-async-errors las captura en Express 4).
 *
 * El primer branch detecta ZodError y mapea err.issues al envelope
 * { error, details: [{field, message}] } — la razón por la que Zod
 * fue elegido: su error estructurado encaja directo en nuestro contrato.
 */
const errorMiddleware = (err, req, res, next) => {
  // Errores de validación Zod — produce un envelope con la lista
  // de campos inválidos y sus mensajes.
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Errores de validación',
      details: err.issues.map((i) => {
        // Si el error es de llaves no reconocidas, Zod las trae en i.keys, no en i.path
        const fieldName = (i.code === 'unrecognized_keys' && i.keys)
          ? i.keys[0]
          : i.path.join('.');
        return {
          field: fieldName,
          message: i.message
        };
      }),
    });
  }

  // JSON malformado del body-parser — debe ir ANTES del branch duck-typed
  // porque body-parser setea err.status=400 y err.message en inglés.
  // Sin este branch, el mensaje en español no se aplicaría.
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Cuerpo de la solicitud no es JSON válido',
    });
  }

  // Payload demasiado grande del body-parser (default 100kb).
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'El cuerpo de la solicitud supera el límite permitido',
    });
  }

  // Errores con forma { status, message } — lo que lanzan los auth middleware,
  // los services (404 cuando no existe un producto) y el forwarder 404.
  // Si además trae `details`, lo incluye en la respuesta.
  if (
    err &&
    typeof err.status === 'number' &&
    typeof err.message === 'string'
  ) {
    const body = { error: err.message };
    if (Array.isArray(err.details)) {
      body.details = err.details;
    }
    return res.status(err.status).json(body);
  }

  // Cualquier otro error → 500 genérico con el stack en consola para diagnóstico.
  if (err && err.stack) {
    console.error(err.stack);
  } else {
    console.error(err);
  }
  return res.status(500).json({ error: 'Error interno del servidor' });
};

export default errorMiddleware;
