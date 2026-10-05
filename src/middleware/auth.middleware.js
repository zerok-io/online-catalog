const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT.
 * Verifica el token en el header: Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Token no proporcionado.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token expirado. Inicia sesión nuevamente.'
        : 'Token inválido.';

    return res.status(401).json({ success: false, message });
  }
}

/**
 * Middleware de autorización por rol.
 * Uso: authorize('admin', 'superadmin')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción.',
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
