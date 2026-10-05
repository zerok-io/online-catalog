const { Pool } = require('pg');

/**
 * Pool de conexiones a PostgreSQL.
 * Reutiliza conexiones existentes para mejor rendimiento.
 */
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT, 10) || 5432,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'online_catalog',
  // Límites del pool
  max:              10,   // Máximo de conexiones simultáneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión al iniciar
pool.on('connect', () => {
  console.log('✅ Conexión a PostgreSQL establecida');
});

pool.on('error', (err) => {
  console.error('❌ Error en el pool de PostgreSQL:', err.message);
  process.exit(1);
});

/**
 * Ejecuta una query con parámetros opcionales.
 * @param {string} text  - Sentencia SQL
 * @param {Array}  params - Parámetros parametrizados ($1, $2, ...)
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtiene un cliente del pool para transacciones.
 * Recuerda llamar a client.release() después de usarlo.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
