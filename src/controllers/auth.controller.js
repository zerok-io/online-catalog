const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { body }  = require('express-validator');
const db        = require('../database/db');

// ── Reglas de validación ──────────────────────────────────────────────────────

/** Validaciones para el endpoint de login */
const loginValidations = [
  body('email')
    .isEmail().withMessage('Email inválido.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida.')
    .isLength({ min: 6 }).withMessage('Mínimo 6 caracteres.'),
];

// ── Controladores ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Autentica al administrador y devuelve un JWT.
 */
async function login(req, res) {
  const { email, password } = req.body;

  try {
    // Buscar usuario activo por email
    const { rows } = await db.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (rows.length === 0) {
      // Respuesta genérica para no filtrar información
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    const user = rows[0];

    // Comparar contraseña con el hash almacenado
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // Generar JWT
    const payload = { id: user.id, email: user.email, role: user.role };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    return res.status(200).json({
      success: true,
      message: 'Login exitoso.',
      data: {
        token,
        user: {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
        },
      },
    });
  } catch (err) {
    console.error('[auth.controller] login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/auth/me
 * Devuelve el perfil del usuario autenticado (requiere JWT).
 */
async function getMe(req, res) {
  try {
    const { rows } = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[auth.controller] getMe error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

module.exports = { login, getMe, loginValidations };
