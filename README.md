# CRM SaaS Multiempresa para Importadoras

Este es el repositorio base del CRM diseñado específicamente para importadoras, construido con una arquitectura moderna, segura y aislada mediante Prisma Client Extensions (Row Level Security lógico).

## 🚀 Fase 2.3: Módulo de Productos y Categorías

El módulo de Productos permite gestionar el catálogo de ventas de cada empresa de manera independiente, aislando completamente el concepto de "Producto" (Atributos comerciales) del "Inventario" (Cantidades).

### Características Principales:
- **Multitenant Seguro:** Todos los SKUs son únicos *por tenant*. Un cliente de la Empresa A no puede ver ni chocar con los SKUs de la Empresa B.
- **Categorías Dinámicas:** Los productos se pueden agrupar por categorías administrables.
- **Soft Delete:** Prevención de pérdida de datos utilizando el estado `INACTIVO`.
- **Proxy de Inventario:** Preparado para integrarse con futuras fases mediante un endpoint dedicado (`/products/:id/stock`).

---

### 📦 Endpoints del Módulo Productos

#### Categorías (`/categories`)
Todas las peticiones requieren los headers `Authorization: Bearer <token>` y `x-tenant-id: <uuid>`.

- `GET /categories` - Lista todas las categorías activas.
- `POST /categories` - Crea una nueva categoría (Payload: `{ nombre, descripcion }`).
- `PATCH /categories/:id` - Actualiza una categoría.
- `DELETE /categories/:id` - Desactiva una categoría (Soft delete).

#### Productos (`/products`)
- `GET /products` - Listado paginado y filtrado. Soporta Query Params: `page`, `limit`, `search`, `categoriaId`, `estado`.
- `GET /products/:id` - Detalle de un producto.
- `GET /products/:id/stock` - Resumen de inventario en tiempo real (Disponible, Reservado, En tránsito).
- `POST /products` - Crea un nuevo producto (Payload: `{ sku, nombre, precioVenta... }`).
- `PATCH /products/:id` - Actualiza un producto existente.
- `DELETE /products/:id` - Desactiva un producto (Soft delete).

---

### 🛠️ Instrucciones de Migración

Dado que se ha actualizado el esquema de datos para añadir el catálogo, debes aplicar la migración antes de iniciar el backend.

```bash
cd backend
npx prisma migrate dev --name add_product_models
```

### 🧪 Ejecución de Pruebas

Se ha implementado una robusta batería de pruebas E2E (End-to-End) que simulan dos empresas distintas para garantizar que no exista filtración de datos entre ellas.

Para correr las pruebas:
```bash
cd backend
npm run test:e2e
```
Para correr las pruebas unitarias:
```bash
cd backend
npm run test
```
