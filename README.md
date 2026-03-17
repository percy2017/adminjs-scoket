# AdminJS - Dashboard Administrativo Genérico

<p align="center">
  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=admin" alt="AdminJS Logo" width="100">
</p>

> Dashboard administrativo genérico construido con Node.js, Express y Sequelize. Perfecto como punto de partida para cualquier proyecto que requiera gestión de usuarios, roles y permisos.

## Características

- ✅ **Gestión de Usuarios** - CRUD completo con búsqueda y paginación
- ✅ **Sistema de Roles y Permisos** - RBAC (Control de acceso basado en roles)
- ✅ **Gestión de Medios** - Subida y organización de archivos
- ✅ **API REST** - Documentación completa con Swagger
- ✅ **Autenticación JWT** - Login, registro, recuperación de contraseña
- ✅ **Tiempo Real** - Socket.IO para actualizaciones en vivo
- ✅ **Diseño Responsivo** - Bootstrap 5 con temas personalizables

## Tecnologías

- **Backend**: Node.js, Express.js
- **Base de Datos**: Sequelize ORM (MySQL, PostgreSQL, SQLite)
- **Frontend**: EJS, Bootstrap 5, DataTables
- **Autenticación**: JWT, bcrypt
- **Tiempo Real**: Socket.IO
- **Documentación**: Swagger UI

## Instalación

```bash
# Clonar el proyecto
git clone <repo-url>
cd admin-socket

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones y seeders
npm run db:fresh

# Iniciar servidor de desarrollo
npm run dev
```

## Configuración

### Variables de entorno (.env)

```env
PORT=3000
NODE_ENV=development

# Base de datos (SQLite por defecto)
DATABASE_URL=./database/adminjs.sqlite

# JWT
JWT_SECRET=tu-secret-aqui
JWT_EXPIRES_IN=24h

# Correo (opcional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=tu-email@example.com
SMTP_PASS=tu-password
```

## Comandos

```bash
npm start          # Iniciar producción
npm run dev        # Desarrollo con nodemon
npm run migrate    # Ejecutar migraciones
npm run db:fresh   # Migrar + seed
npm run media:clear # Limpiar archivos media
```

## Estructura del Proyecto

```
admin-socket/
├── app.js                 # Configuración de Express
├── bin/www               # Punto de entrada
├── config/               # Configuraciones
│   ├── app.js
│   ├── database.js
│   └── swagger.js
├── controllers/          # Controladores
│   ├── api/
│   └── admin/
├── database/
│   ├── models/         # Modelos Sequelize
│   ├── migrations/
│   └── seeders/
├── middleware/         # Middleware Express
├── public/            # Archivos estáticos
├── routes/            # Rutas Express
├── scripts/           # Scripts de utilidad
└── views/             # Plantillas EJS
```

## API REST

La API REST está disponible en `/api` con documentación Swagger en:

- **JSON**: `/swagger.json`
- **UI**: `/docs`

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/users` | Listar usuarios |
| POST | `/api/users` | Crear usuario |
| GET | `/api/roles` | Listar roles |
| POST | `/api/roles/generate` | Generar permisos |
| GET | `/api/permissions` | Listar permisos |

### Autenticación

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adminjs.com","password":"admin123"}'

# Usar token
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <tu-token>"
```

## Roles y Permisos

El sistema incluye un sistema de permisos granular:

- **admin**: Acceso completo
- **editor**: Crear y editar
- **guest**: Solo lectura

Los permisos se generan automáticamente con el endpoint `/api/roles/generate`:

```json
{
  "table_name": "products"
}
```

Esto crea: `browse_products`, `read_products`, `add_products`, `edit_products`, `delete_products`

## Extensión del Dashboard

### Agregar Nueva Sección

1. **Crear modelo**: `database/models/Nombre.js`
2. **Crear controlador**: `controllers/nombreController.js`
3. **Crear rutas**: `routes/nombre.js`
4. **Crear vistas**: `views/admin/nombre/index.ejs`
5. **Agregar al sidebar**: `views/admin/partials/sidebar.ejs`

### Generar Permisos para Nuevas Secciones

```bash
# Generar permisos para cualquier recurso
curl -X POST http://localhost:3000/api/roles/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"table_name":"productos"}'
```

## Desarrollo

### Credenciales por Defecto

- **Email**: admin@adminjs.com
- **Contraseña**: admin123

### Testing

```bash
# El servidor debe estar corriendo en puerto 3000
npm run dev

# Usar playwright-cli para pruebas E2E
playwright-cli open http://localhost:3000
```

## Licencia

MIT
