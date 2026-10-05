const { Router } = require('express');
const {
  listCategories, createCategory, updateCategory, deleteCategory, categoryValidations,
} = require('../controllers/categories.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');

const router = Router();

// Pública: listar categorías
router.get('/',      listCategories);

// Protegidas: CRUD de categorías
router.post('/',        authenticate, categoryValidations, validate, createCategory);
router.put('/:id',      authenticate, categoryValidations, validate, updateCategory);
router.delete('/:id',   authenticate, deleteCategory);

module.exports = router;
