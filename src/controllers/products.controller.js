const { body, query, param } = require('express-validator');
const db = require('../database/db');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Genera un slug URL-friendly a partir de un título */
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Respuesta estándar de paginación */
function paginate(page, limit, total) {
  const totalPages  = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
}

// ── Reglas de validación ──────────────────────────────────────────────────────

const createProductValidations = [
  body('title')
    .trim()
    .notEmpty().withMessage('El título es requerido.')
    .isLength({ max: 255 }).withMessage('Máximo 255 caracteres.'),
  body('price')
    .notEmpty().withMessage('El precio es requerido.')
    .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo.'),
  body('description')
    .optional().trim()
    .isLength({ max: 5000 }).withMessage('Descripción demasiado larga.'),
  body('compare_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('El precio comparativo debe ser positivo.'),
  body('image_url')
    .optional({ nullable: true })
    .isURL().withMessage('URL de imagen inválida.'),
  body('category_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('category_id inválido.'),
  body('is_available')
    .optional()
    .isBoolean().withMessage('is_available debe ser true o false.'),
  body('is_featured')
    .optional()
    .isBoolean().withMessage('is_featured debe ser true o false.'),
  body('sku')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }).withMessage('SKU demasiado largo.'),
];

const updateProductValidations = [
  param('id').isInt({ min: 1 }).withMessage('ID de producto inválido.'),
  body('title')
    .optional().trim()
    .isLength({ min: 1, max: 255 }).withMessage('Título inválido.'),
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('El precio debe ser positivo.'),
  body('description').optional().trim(),
  body('compare_price')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Precio comparativo inválido.'),
  body('image_url')
    .optional({ nullable: true })
    .isURL().withMessage('URL de imagen inválida.'),
  body('category_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('category_id inválido.'),
  body('is_available')
    .optional()
    .isBoolean().withMessage('is_available debe ser true o false.'),
  body('is_featured')
    .optional()
    .isBoolean().withMessage('is_featured debe ser true o false.'),
];

// ── Controladores ─────────────────────────────────────────────────────────────

/**
 * GET /api/products
 * Lista pública de productos disponibles con paginación y filtros.
 */
async function listProducts(req, res) {
  try {
    // Parámetros de query
    const page        = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit       = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const offset      = (page - 1) * limit;
    const category    = req.query.category  || null;  // slug de categoría
    const featured    = req.query.featured  || null;  // 'true' para destacados
    const search      = req.query.search    || null;  // búsqueda de texto
    const adminView   = req.query.all === 'true' && req.user?.role === 'admin'; // admin puede ver todos

    // Construir WHERE dinámico
    const conditions = [];
    const values     = [];
    let   idx        = 1;

    if (!adminView) {
      conditions.push(`p.is_available = TRUE`);
    }

    if (category) {
      conditions.push(`c.slug = $${idx++}`);
      values.push(category);
    }

    if (featured === 'true') {
      conditions.push(`p.is_featured = TRUE`);
    }

    if (search) {
      conditions.push(
        `to_tsvector('spanish', coalesce(p.title,'') || ' ' || coalesce(p.description,'')) @@ plainto_tsquery('spanish', $${idx++})`
      );
      values.push(search);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query de conteo total
    const countSql = `
      SELECT COUNT(*) FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}`;

    const dataSql = `
      SELECT
        p.id, p.title, p.slug, p.description,
        p.price, p.compare_price, p.currency,
        p.image_url, p.images, p.sku,
        p.stock_quantity, p.is_available, p.is_featured,
        p.tags, p.created_at, p.updated_at,
        c.id   AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}`;

    const paginationValues = [...values, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      db.query(countSql, values),
      db.query(dataSql, paginationValues),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return res.status(200).json({
      success: true,
      data:    dataResult.rows,
      meta:    paginate(page, limit, total),
    });
  } catch (err) {
    console.error('[products.controller] listProducts error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

/**
 * GET /api/products/:id
 * Obtiene un producto por ID (público si está disponible).
 */
async function getProduct(req, res) {
  const { id } = req.params;
  const isAdmin = req.user?.role === 'admin';

  try {
    const availableClause = isAdmin ? '' : 'AND p.is_available = TRUE';

    const { rows } = await db.query(
      `SELECT
         p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 ${availableClause}`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[products.controller] getProduct error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

/**
 * POST /api/products
 * Crea un nuevo producto. Requiere JWT de admin.
 */
async function createProduct(req, res) {
  const {
    title, description, price, compare_price,
    image_url, images, category_id,
    is_available = true, is_featured = false,
    sku, stock_quantity, tags, metadata, currency,
  } = req.body;

  const slug = slugify(title);

  try {
    // Verificar slug único
    const exists = await db.query('SELECT id FROM products WHERE slug = $1', [slug]);
    let finalSlug = slug;
    if (exists.rows.length > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const { rows } = await db.query(
      `INSERT INTO products
         (title, slug, description, price, compare_price, image_url, images,
          category_id, is_available, is_featured, sku, stock_quantity,
          tags, metadata, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        title, finalSlug, description || null, price, compare_price || null,
        image_url || null, JSON.stringify(images || []),
        category_id || null, is_available, is_featured,
        sku || null, stock_quantity || 0,
        JSON.stringify(tags || []), JSON.stringify(metadata || {}),
        currency || 'USD',
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente.',
      data:    rows[0],
    });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({
        success: false,
        message: 'Ya existe un producto con ese SKU o slug.',
      });
    }
    console.error('[products.controller] createProduct error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

/**
 * PUT /api/products/:id
 * Actualiza un producto. Requiere JWT de admin.
 * Solo actualiza los campos enviados (PATCH-style).
 */
async function updateProduct(req, res) {
  const { id } = req.params;

  const allowed = [
    'title', 'description', 'price', 'compare_price',
    'image_url', 'images', 'category_id',
    'is_available', 'is_featured', 'sku',
    'stock_quantity', 'tags', 'metadata', 'currency',
  ];

  // Construir SET dinámico con solo los campos enviados
  const fields  = [];
  const values  = [];
  let   idx     = 1;

  for (const key of allowed) {
    if (key in req.body) {
      let val = req.body[key];
      if (key === 'images' || key === 'tags' || key === 'metadata') {
        val = JSON.stringify(val);
      }
      if (key === 'title') {
        // Actualizar slug si cambia el título
        fields.push(`slug = $${idx++}`);
        values.push(slugify(val));
      }
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No se enviaron campos para actualizar.',
    });
  }

  values.push(id); // para el WHERE

  try {
    const { rows } = await db.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Producto actualizado.',
      data:    rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Conflicto: SKU o slug ya en uso.',
      });
    }
    console.error('[products.controller] updateProduct error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

/**
 * DELETE /api/products/:id
 * Elimina un producto. Requiere JWT de admin.
 */
async function deleteProduct(req, res) {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      'DELETE FROM products WHERE id = $1 RETURNING id, title',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    return res.status(200).json({
      success: true,
      message: `Producto "${rows[0].title}" eliminado.`,
    });
  } catch (err) {
    console.error('[products.controller] deleteProduct error:', err);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductValidations,
  updateProductValidations,
};
