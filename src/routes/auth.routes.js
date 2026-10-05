const { Router } = require('express');
const { login, getMe, loginValidations }  = require('../controllers/auth.controller');
const { authenticate }                    = require('../middleware/auth.middleware');
const { validate }                        = require('../middleware/validate.middleware');

const router = Router();

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Respuesta: { token, user }
 */
router.post('/login', loginValidations, validate, login);

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Devuelve el perfil del administrador autenticado.
 */
router.get('/me', authenticate, getMe);

module.exports = router;
