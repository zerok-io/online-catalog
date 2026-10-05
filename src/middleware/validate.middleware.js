const { validationResult } = require('express-validator');

/**
 * Middleware de validación de express-validator.
 * Retorna 422 si hay errores de validación.
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Datos de entrada inválidos.',
      errors: errors.array().map(e => ({
        field:   e.path,
        message: e.msg,
      })),
    });
  }

  next();
}

module.exports = { validate };
