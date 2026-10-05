/**
 * migrate.js — Ejecuta el schema SQL contra la base de datos.
 * Uso: node src/database/migrate.js
 */
require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql        = fs.readFileSync(schemaPath, 'utf8');

  console.log('🔄 Ejecutando migración...');
  try {
    await pool.query(sql);
    console.log('✅ Migración completada exitosamente');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
