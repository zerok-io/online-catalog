/**
 * seed.js — Crea el usuario administrador inicial y datos de ejemplo.
 * Uso: node src/database/seed.js
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  console.log('🌱 Ejecutando seed...');

  try {
    // ── Usuario admin ──────────────────────────────────────────
    const adminEmail    = 'admin@tutienda.com';
    const adminPassword = 'Admin1234!';  // ← Cambiar después del primer login
    const hashedPass    = await bcrypt.hash(adminPassword, 12);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      ['Administrador', adminEmail, hashedPass, 'admin']
    );

    if (userResult.rows.length > 0) {
      console.log(`✅ Admin creado: ${adminEmail} / contraseña: ${adminPassword}`);
      console.log('   ⚠️  CAMBIAR LA CONTRASEÑA INMEDIATAMENTE');
    } else {
      console.log(`ℹ️  Admin ya existe: ${adminEmail}`);
    }

    // ── Categorías de ejemplo ──────────────────────────────────
    const categories = [
      { name: 'Electrónica',   slug: 'electronica',   description: 'Gadgets y dispositivos electrónicos' },
      { name: 'Moda',          slug: 'moda',           description: 'Ropa y accesorios importados' },
      { name: 'Hogar',         slug: 'hogar',          description: 'Artículos para el hogar' },
      { name: 'Juguetes',      slug: 'juguetes',       description: 'Juguetes y entretenimiento' },
    ];

    for (const cat of categories) {
      await pool.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.slug, cat.description]
      );
    }
    console.log('✅ Categorías de ejemplo creadas');

    // ── Productos de ejemplo ───────────────────────────────────
    const { rows: cats } = await pool.query('SELECT id, slug FROM categories LIMIT 4');
    const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

    const products = [
      {
        title:         'Auriculares Bluetooth Pro',
        slug:          'auriculares-bluetooth-pro',
        description:   'Auriculares inalámbricos con cancelación de ruido activa y 30h de batería.',
        price:         89.99,
        compare_price: 120.00,
        image_url:     'https://placehold.co/600x400?text=Auriculares',
        is_available:  true,
        is_featured:   true,
        category_id:   catMap['electronica'],
        sku:           'ELEC-001',
      },
      {
        title:         'Smartwatch Serie X',
        slug:          'smartwatch-serie-x',
        description:   'Reloj inteligente con GPS, monitor cardíaco y resistencia al agua.',
        price:         149.99,
        compare_price: null,
        image_url:     'https://placehold.co/600x400?text=Smartwatch',
        is_available:  true,
        is_featured:   false,
        category_id:   catMap['electronica'],
        sku:           'ELEC-002',
      },
      {
        title:         'Chaqueta de Cuero Premium',
        slug:          'chaqueta-cuero-premium',
        description:   'Chaqueta de cuero genuino, talla M, color negro.',
        price:         210.00,
        compare_price: 280.00,
        image_url:     'https://placehold.co/600x400?text=Chaqueta',
        is_available:  false,  // Ejemplo agotado
        is_featured:   false,
        category_id:   catMap['moda'],
        sku:           'MODA-001',
      },
    ];

    for (const p of products) {
      await pool.query(
        `INSERT INTO products
           (category_id, title, slug, description, price, compare_price, image_url, is_available, is_featured, sku)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (slug) DO NOTHING`,
        [p.category_id, p.title, p.slug, p.description, p.price, p.compare_price,
         p.image_url, p.is_available, p.is_featured, p.sku]
      );
    }
    console.log('✅ Productos de ejemplo creados');

  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
