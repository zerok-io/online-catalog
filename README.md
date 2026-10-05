# Online Catalog API

## Guía de instalación y uso

---

## Requisitos previos

| Herramienta | Versión mínima | Descarga |
|-------------|----------------|----------|
| Node.js     | 18.x           | https://nodejs.org |
| PostgreSQL   | 14.x           | https://www.postgresql.org/download/ |
| npm         | 9.x (incluido con Node.js) | — |

---

## 1. Clonar y configurar

```bash
# 1. Entrar al directorio del proyecto
cd online-catalog

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno
cp .env.example .env
```

Luego edita `.env` con tus valores reales:

```ini
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_AQUI
DB_NAME=online_catalog
JWT_SECRET=genera_un_secreto_largo_y_aleatorio
JWT_EXPIRES_IN=24h
```

> **Genera un JWT_SECRET seguro con:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## 2. Preparar la base de datos

```bash
# 2a. Crear la base de datos en PostgreSQL
psql -U postgres -c "CREATE DATABASE online_catalog;"

# 2b. Ejecutar el schema (crea tablas, indices y triggers)
npm run db:migrate

# 2c. Cargar datos iniciales (admin + categorias + productos de ejemplo)
npm run db:seed
```

Tras el seed, el usuario administrador por defecto es:
- **Email:** `admin@tutienda.com`
- **Contrasena:** `Admin1234!`

> IMPORTANTE: Cambia la contrasena despues del primer login.

---

## 3. Ejecutar el servidor

```bash
# Modo desarrollo (recarga automatica con nodemon)
npm run dev

# Modo produccion
npm start
```

El servidor estara disponible en: `http://localhost:3000`

Verifica que funciona:
```bash
curl http://localhost:3000/api/health
```

---

## 4. Endpoints de la API

### Autenticacion

| Metodo | Ruta              | Auth | Descripcion                  |
|--------|-------------------|------|------------------------------|
| POST   | /api/auth/login   | No   | Obtener token JWT            |
| GET    | /api/auth/me      | Si   | Ver perfil del administrador |

#### Ejemplo: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tutienda.com","password":"Admin1234!"}'
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": "...", "name": "Administrador", "email": "admin@tutienda.com", "role": "admin" }
  }
}
```

---

### Productos

| Metodo | Ruta                  | Auth | Descripcion                             |
|--------|-----------------------|------|-----------------------------------------|
| GET    | /api/products         | No   | Listar productos disponibles (paginado) |
| GET    | /api/products/:id     | No   | Ver detalle de un producto              |
| POST   | /api/products         | Si   | Crear producto                          |
| PUT    | /api/products/:id     | Si   | Actualizar producto (parcial)           |
| DELETE | /api/products/:id     | Si   | Eliminar producto                       |

#### Parametros de consulta (GET /api/products)

| Parametro  | Tipo    | Ejemplo               | Descripcion                       |
|------------|---------|-----------------------|-----------------------------------|
| page       | integer | ?page=2               | Numero de pagina (default: 1)     |
| limit      | integer | ?limit=10             | Resultados por pagina (max: 100)  |
| category   | string  | ?category=electronica | Filtrar por slug de categoria     |
| featured   | boolean | ?featured=true        | Solo productos destacados         |
| search     | string  | ?search=auriculares   | Busqueda de texto completo        |
| all        | boolean | ?all=true             | Admin: incluir agotados           |

#### Ejemplo: Listar productos

```bash
curl "http://localhost:3000/api/products?page=1&limit=10&category=electronica"
```

#### Ejemplo: Crear producto (requiere token)

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "title": "iPhone 15 Pro",
    "description": "Smartphone Apple ultimo modelo",
    "price": 999.99,
    "compare_price": 1199.99,
    "image_url": "https://ejemplo.com/imagen.jpg",
    "category_id": 1,
    "is_available": true,
    "is_featured": true,
    "sku": "APPLE-IP15P"
  }'
```

#### Ejemplo: Marcar como agotado

```bash
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"is_available": false}'
```

#### Ejemplo: Eliminar producto

```bash
curl -X DELETE http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

---

### Categorias

| Metodo | Ruta                  | Auth | Descripcion              |
|--------|-----------------------|------|--------------------------|
| GET    | /api/categories       | No   | Listar categorias activas |
| POST   | /api/categories       | Si   | Crear categoria          |
| PUT    | /api/categories/:id   | Si   | Actualizar categoria     |
| DELETE | /api/categories/:id   | Si   | Eliminar categoria       |

---

## 5. Estructura del proyecto

```
online-catalog/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js       # Login y perfil
│   │   ├── products.controller.js   # CRUD de productos
│   │   └── categories.controller.js # CRUD de categorias
│   ├── database/
│   │   ├── db.js          # Pool de conexiones PostgreSQL
│   │   ├── schema.sql     # Definicion de tablas e indices
│   │   ├── migrate.js     # Ejecuta el schema SQL
│   │   └── seed.js        # Datos iniciales
│   ├── middleware/
│   │   ├── auth.middleware.js     # Verificacion JWT + roles
│   │   └── validate.middleware.js # Errores de validacion
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── products.routes.js
│   │   └── categories.routes.js
│   └── server.js          # Punto de entrada Express
├── uploads/               # Imagenes subidas localmente
├── .env                   # Variables de entorno (NO commitear)
├── .env.example           # Plantilla de configuracion
├── .gitignore
└── package.json
```

---

## 6. Seguridad implementada

- **Contrasenas**: Hasheadas con bcrypt (salt rounds: 12).
- **JWT**: Tokens firmados con secreto configurable y expiracion de 24h.
- **SQL Injection**: Consultas parametrizadas en todos los endpoints.
- **Validacion**: express-validator en todos los inputs del usuario.
- **CORS**: Configurable por entorno.
- **Respuestas genericas**: El login no filtra si el email existe o no.

---

## 7. Proximos pasos sugeridos

- [ ] Subida real de imagenes (Cloudinary o AWS S3)
- [ ] Endpoint para cambiar contrasena del admin
- [ ] Rate limiting con express-rate-limit
- [ ] Cache de catalogo con Redis
- [ ] Tests automatizados con Jest + Supertest
- [ ] Docker Compose para desarrollo local
- [ ] Frontend (React/Vue) que consuma esta API
