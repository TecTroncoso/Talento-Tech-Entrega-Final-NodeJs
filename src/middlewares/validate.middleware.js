/**
 * Factory de middleware de validación con Zod.
 * Recibe un esquema y devuelve un middleware que valida req.body.
 * En caso de éxito, sobrescribe req.body con la versión parseada (trim aplicado).
 * En caso de fallo, delega el ZodError al handler central via next(err).
 *
 * Se usa Zod (no Joi) porque safeParse() devuelve issues estructurados
 * que el handler central mapea directamente al envelope de respuesta.
 */
export const validate = (schema) => (req, res, next) => {
  const body = req.body ?? {};
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return next(parsed.error);
  }

  // Sobrescribe req.body con la versión parseada para que el
  // controlador reciba strings trimmeados y valores validados.
  req.body = parsed.data;
  return next();
};
