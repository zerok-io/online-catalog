const { Router }        = require('express');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductValidations,
  updateProductValidations,
} = require('../controllers/products.controller');
const { authenticate }  = require('../middleware/auth.middleware');
const { validate }      = require('../middleware/validate.middleware');

const router = Router();

// ── Rutas PÚBLICAS ────────────────────────────────────────────────────────────
/**
 * GET /api/products
 * Query params opcionales:
 *   ?page=1 &limit=20 &category=electronica &featured=true &search=auricular
 *   ?all=true   (solo admins autenticados, muestra productos agotados también)
 */
router.get('/', listProducts);

/**
 * GET /api/products/:id
 * Detalle de un producto.
 */
router.get('/:id', getProduct);

// ── Rutas PROTEGIDAS (requieren JWT) ──────────────────────────────────────────
/**
 * POST /api/products
 * Crea un nuevo producto en el catálogo.
 * Body requerido: { title, price }
 * Body opcional: { description, compare_price, image_url, category_id,
 *                  is_available, is_featured, sku, stock_quantity, tags }
 */
router.post(
  '/',
  authenticate,
  createProductValidations,
  validate,
  createProduct
);

/**
 * PUT /api/products/:id
 * Actualiza uno o más campos de un producto.
 * Acepta cualquier subconjunto de campos (PATCH-style sobre PUT).
 */
router.put(
  '/:id',
  authenticate,
  updateProductValidations,
  validate,
  updateProduct
);

/**
 * DELETE /api/products/:id
 * Elimina permanentemente un producto.
 */
router.delete('/:id', authenticate, deleteProduct);

module.exports = router;
