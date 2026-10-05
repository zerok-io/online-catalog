const { body } = require('express-validator');
const db = require('../database/db');

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-');
}

const categoryValidations = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido.')
    .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  body('description').optional().trim(),
  body('sort_order').optional().isInt({ min: 0 }).withMessage('sort_order debe ser entero positivo.'),
  body('is_active').optional().isBoolean(),
];

/** GET /api/categories — Lista todas las categorías activas */
async function listCategories(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_available = TRUE
       WHERE c.is_active = TRUE
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[categories.controller] listCategories error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

/** POST /api/categories — Crea categoría (admin) */
async function createCategory(req, res) {
  const { name, description, sort_order = 0 } = req.body;
  const slug = slugify(name);

  try {
    const { rows } = await db.query(
      `INSERT INTO categories (name, slug, description, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, slug, description || null, sort_order]
    );
    return res.status(201).json({ success: true, message: 'Categoría creada.', data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ya existe una categoría con ese nombre.' });
    }
    console.error('[categories.controller] createCategory error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

/** PUT /api/categories/:id — Actualiza categoría (admin) */
async function updateCategory(req, res) {
  const { id } = req.params;
  const { name, description, sort_order, is_active } = req.body;

  const fields = []; const values = []; let idx = 1;
  if (name       !== undefined) { fields.push(`name = $${idx++}`, `slug = $${idx++}`); values.push(name, slugify(name)); }
  if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
  if (sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(sort_order); }
  if (is_active  !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

  if (fields.length === 0) return res.status(400).json({ success: false, message: 'Sin campos para actualizar.' });

  values.push(id);
  try {
    const { rows } = await db.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[categories.controller] updateCategory error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

/** DELETE /api/categories/:id — Elimina categoría (admin) */
async function deleteCategory(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await db.query('DELETE FROM categories WHERE id = $1 RETURNING id, name', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    return res.status(200).json({ success: true, message: `Categoría "${rows[0].name}" eliminada.` });
  } catch (err) {
    console.error('[categories.controller] deleteCategory error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory, categoryValidations };
