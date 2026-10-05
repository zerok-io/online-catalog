-- =============================================
-- ESQUEMA DE BASE DE DATOS - Online Catalog
-- =============================================
-- Ejecutar con: psql -U postgres -d online_catalog -f schema.sql

-- Crear la base de datos (ejecutar como superusuario)
-- CREATE DATABASE online_catalog;

-- =============================================
-- EXTENSIONES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: users (Administradores del sistema)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100)  NOT NULL,
    email       VARCHAR(255)  NOT NULL UNIQUE,
    password    VARCHAR(255)  NOT NULL,           -- Hash bcrypt
    role        VARCHAR(20)   NOT NULL DEFAULT 'admin'
                              CHECK (role IN ('admin', 'superadmin')),
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Usuarios administradores del catálogo';
COMMENT ON COLUMN users.password IS 'Hash bcrypt — nunca almacenar texto plano';

-- =============================================
-- TABLA: categories (Categorías de productos)
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL UNIQUE,
    slug        VARCHAR(120)  NOT NULL UNIQUE,    -- URL-friendly
    description TEXT,
    sort_order  INTEGER       NOT NULL DEFAULT 0,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'Categorías para organizar los productos del catálogo';

-- =============================================
-- TABLA: products (Catálogo de productos)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id              SERIAL          PRIMARY KEY,
    category_id     INTEGER         REFERENCES categories(id) ON DELETE SET NULL,
    title           VARCHAR(255)    NOT NULL,
    slug            VARCHAR(280)    NOT NULL UNIQUE,   -- URL-friendly, generado del título
    description     TEXT,
    price           NUMERIC(12, 2)  NOT NULL CHECK (price >= 0),
    compare_price   NUMERIC(12, 2)  CHECK (compare_price >= 0),  -- Precio tachado/original
    currency        VARCHAR(3)      NOT NULL DEFAULT 'USD',
    image_url       VARCHAR(1000),                    -- URL principal de imagen
    images          JSONB           DEFAULT '[]',      -- Array de URLs adicionales
    sku             VARCHAR(100)    UNIQUE,             -- Código de producto
    stock_quantity  INTEGER         DEFAULT 0 CHECK (stock_quantity >= 0),
    is_available    BOOLEAN         NOT NULL DEFAULT TRUE,   -- Disponible / Agotado
    is_featured     BOOLEAN         NOT NULL DEFAULT FALSE,  -- Destacado en catálogo
    tags            JSONB           DEFAULT '[]',      -- Tags de búsqueda
    metadata        JSONB           DEFAULT '{}',      -- Campos extra flexibles
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE products IS 'Catálogo de productos importados';
COMMENT ON COLUMN products.is_available IS 'TRUE = disponible, FALSE = agotado/oculto';
COMMENT ON COLUMN products.compare_price IS 'Precio original para mostrar descuento';
COMMENT ON COLUMN products.images IS 'Array JSON de URLs de imágenes adicionales';

-- =============================================
-- ÍNDICES DE RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available  ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_featured   ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_slug       ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_created    ON products(created_at DESC);
-- Búsqueda de texto completo
CREATE INDEX IF NOT EXISTS idx_products_fts ON products
    USING gin(to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, '')));

-- =============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
