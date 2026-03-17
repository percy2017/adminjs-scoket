import 'dotenv/config';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AdminJS API',
      version: '1.0.0',
      description: `
# API REST para Administración

Esta API proporciona endpoints para la gestión de usuarios, roles, permisos y medios.

## Autenticación
Todos los endpoints protegidos requieren un token JWT en el header:
\`Authorization: Bearer <token>\`

## Obtención del Token
1. Llama a \`POST /api/auth/login\` con email y password
2. El response incluye \`token\` que debe usarse en las siguientes peticiones
3. El token expira según la configuración del servidor

## Roles Disponibles
- **admin**: Administrador con acceso completo
- **editor**: Editor puede crear y editar pero no eliminar
- **guest**: Solo lectura
- Roles personalizados pueden ser creados

## Paginación
Los endpoints de lista soportan paginación:
- \`page\`: Número de página (default: 1)
- \`limit\": Elementos por página (default: 10 o 20 según el endpoint)

## Códigos de Respuesta
- \`200\`: Operación exitosa
- \`201\`: Recurso creado exitosamente
- \`400\`: Error de validación o datos inválidos
- \`401\`: No autorizado (token inválido o faltante)
- \`403\`: Forbidden (sin permisos)
- \`404\`: Recurso no encontrado
- \`500\`: Error interno del servidor
      `,
      contact: {
        name: 'AdminJS',
        email: 'admin@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: APP_URL,
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido de /api/auth/login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          description: 'Usuario del sistema',
          properties: {
            id: { type: 'integer', description: 'ID único del usuario', example: 1 },
            name: { type: 'string', description: 'Nombre completo', example: 'Juan Pérez' },
            email: { type: 'string', format: 'email', description: 'Email único del usuario', example: 'juan@ejemplo.com' },
            role_id: { type: 'integer', description: 'ID del rol asociado', example: 1, nullable: true },
            role: { type: 'string', description: 'Nombre del rol (usado en creación/actualización)', enum: ['admin', 'editor', 'guest'], example: 'guest' },
            status: { type: 'boolean', description: 'Estado de la cuenta (true = habilitada)', example: true },
            phone: { type: 'string', description: 'Número de teléfono', example: '+51 999 999 999', nullable: true },
            avatar: { type: 'string', description: 'URL del avatar', example: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', nullable: true },
            createdAt: { type: 'string', format: 'date-time', description: 'Fecha de creación' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Fecha de última actualización' },
            roleData: { type: 'object', description: 'Datos del rol (en respuestas con include)', properties: { id: { type: 'integer' }, name: { type: 'string' }, description: { type: 'string' } } }
          },
          required: ['name', 'email']
        },
        UserCreate: {
          type: 'object',
          description: 'Datos para crear un usuario',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', description: 'Nombre completo del usuario', example: 'Juan Pérez' },
            email: { type: 'string', format: 'email', description: 'Email único', example: 'juan@ejemplo.com' },
            password: { type: 'string', description: 'Contraseña (mínimo 6 caracteres)', example: 'password123' },
            role: { type: 'string', description: 'Nombre del rol (debe existir en la base de datos)', enum: ['admin', 'editor', 'guest'], example: 'guest' },
            phone: { type: 'string', description: 'Número de teléfono', example: '+51 999 999 999' },
            avatar: { type: 'string', description: 'URL del avatar', example: 'https://example.com/avatar.jpg' },
            status: { type: 'boolean', description: 'Estado de la cuenta', example: true }
          }
        },
        UserUpdate: {
          type: 'object',
          description: 'Datos para actualizar un usuario (todos los campos son opcionales)',
          properties: {
            name: { type: 'string', description: 'Nombre completo' },
            email: { type: 'string', format: 'email', description: 'Email único' },
            password: { type: 'string', description: 'Nueva contraseña (mínimo 6 caracteres)' },
            role: { type: 'string', description: 'Nombre del rol', enum: ['admin', 'editor', 'guest'] },
            phone: { type: 'string', description: 'Número de teléfono' },
            avatar: { type: 'string', description: 'URL del avatar' },
            status: { type: 'boolean', description: 'Estado de la cuenta' }
          }
        },
        Role: {
          type: 'object',
          description: 'Rol del sistema',
          properties: {
            id: { type: 'integer', description: 'ID único del rol', example: 1 },
            name: { type: 'string', description: 'Nombre único del rol', example: 'admin' },
            description: { type: 'string', description: 'Descripción del rol', example: 'Administrador con acceso completo', nullable: true },
            permissions: { type: 'array', description: 'Lista de permisos asociados', items: { $ref: '#/components/schemas/Permission' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['name']
        },
        RoleCreate: {
          type: 'object',
          description: 'Datos para crear un rol',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Nombre único del rol (ej: manager, supervisor)', example: 'manager' },
            description: { type: 'string', description: 'Descripción del rol', example: 'Gerente del sistema' },
            permissions: { type: 'array', description: 'Array de IDs de permisos', items: { type: 'integer' }, example: [1, 2, 3] }
          }
        },
        Permission: {
          type: 'object',
          description: 'Permiso del sistema',
          properties: {
            id: { type: 'integer', description: 'ID único del permiso', example: 1 },
            key: { type: 'string', description: 'Clave del permiso (formato: accion_recurso)', example: 'browse_users' },
            table_name: { type: 'string', description: 'Nombre de la tabla/recurso', example: 'users', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Media: {
          type: 'object',
          description: 'Archivo multimedia',
          properties: {
            id: { type: 'integer', description: 'ID único del medio', example: 1 },
            filename: { type: 'string', description: 'Nombre del archivo', example: 'image-123456.jpg' },
            original_name: { type: 'string', description: 'Nombre original del archivo', example: 'foto-perfil.jpg' },
            mime_type: { type: 'string', description: 'Tipo MIME', example: 'image/jpeg' },
            size: { type: 'integer', description: 'Tamaño en bytes', example: 102400 },
            url: { type: 'string', description: 'URL pública del archivo', example: '/uploads/image-123456.jpg' },
            alt_text: { type: 'string', description: 'Texto alternativo', nullable: true },
            caption: { type: 'string', description: 'Descripción del archivo', nullable: true },
            type: { type: 'string', description: 'Tipo de medio', enum: ['image', 'video', 'audio', 'document', 'other'], example: 'image' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        LoginRequest: {
          type: 'object',
          description: 'Credenciales de login',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', description: 'Email del usuario', example: 'admin@adminjs.com' },
            password: { type: 'string', description: 'Contraseña del usuario', example: 'admin123' }
          }
        },
        LoginResponse: {
          type: 'object',
          description: 'Respuesta de login exitosa',
          properties: {
            success: { type: 'boolean', example: true },
            token: { type: 'string', description: 'JWT token para autenticación', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { type: 'object', description: 'Datos del usuario sin password', properties: { id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' }, role_id: { type: 'integer' }, status: { type: 'boolean' }, avatar: { type: 'string' }, phone: { type: 'string' } } }
          }
        },
        PaginatedResponse: {
          type: 'object',
          description: 'Estructura de respuesta paginada',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer', description: 'Total de registros' },
                page: { type: 'integer', description: 'Página actual' },
                limit: { type: 'integer', description: 'Registros por página' },
                pages: { type: 'integer', description: 'Total de páginas' }
              }
            }
          }
        },
        Error: {
          type: 'object',
          description: 'Respuesta de error',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', description: 'Mensaje de error', example: 'Credenciales inválidas' }
          }
        },
        Success: {
          type: 'object',
          description: 'Respuesta de éxito',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', description: 'Mensaje de éxito', example: 'Operación realizada correctamente' }
          }
        },
        GeneratePermissionsRequest: {
          type: 'object',
          description: 'Solicitud para generar permisos automáticamente',
          required: ['table_name'],
          properties: {
            table_name: { type: 'string', description: 'Nombre del recurso/tabla para generar permisos', example: 'products', minLength: 1 }
          }
        },
        GeneratePermissionsResponse: {
          type: 'object',
          description: 'Respuesta de generación de permisos',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Se crearon 5 permisos para products' },
            permissions: {
              type: 'array',
              items: { type: 'object', properties: { id: { type: 'integer' }, key: { type: 'string' }, table_name: { type: 'string' } } },
              example: [
                { id: 18, key: 'browse_products', table_name: 'products' },
                { id: 19, key: 'read_products', table_name: 'products' },
                { id: 20, key: 'add_products', table_name: 'products' },
                { id: 21, key: 'edit_products', table_name: 'products' },
                { id: 22, key: 'delete_products', table_name: 'products' }
              ]
            }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }],
    tags: [
      { name: 'Auth', description: 'Endpoints de autenticación' },
      { name: 'Users', description: 'Gestión de usuarios' },
      { name: 'Roles', description: 'Gestión de roles y permisos' },
      { name: 'Media', description: 'Gestión de archivos multimedia' }
    ]
  },
  apis: ['./routes/*.js']
};

export default swaggerOptions;
