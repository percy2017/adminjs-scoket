import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { User, Role } from '../database/models/index.js';
import { Media } from '../database/models/Media.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import config from '../config/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const authApi = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'public/uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión y obtener token JWT
 *     description: |
 *       Autentica al usuario y retorna un token JWT válido.
 *       El token debe usarse en el header de las siguientes peticiones: `Authorization: Bearer <token>`
 *     operationId: login
 *     requestBody:
 *       required: true
 *       description: Credenciales del usuario
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "admin@adminjs.com"
 *             password: "admin123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               success: true
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               user:
 *                 id: 1
 *                 name: "Administrador"
 *                 email: "admin@adminjs.com"
 *                 role_id: 1
 *                 status: true
 *                 avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin"
 *                 phone: "+51 999 999 999"
 *       400:
 *         description: Solicitud inválida (faltan datos)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Credenciales inválidas o cuenta deshabilitada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_credentials:
 *                 value:
 *                   success: false
 *                   message: "Credenciales inválidas"
 *               disabled_account:
 *                 value:
 *                   success: false
 *                   message: "Cuenta deshabilitada"
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    if (!user.status) {
      return res.status(401).json({ success: false, message: 'Cuenta deshabilitada' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({ success: true, token, user: userResponse });
  } catch (error) {
    console.error('API Error login:', error);
    res.status(500).json({ success: false, message: 'Error al iniciar sesión' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrar nuevo usuario
 *     description: |
 *       Registra un nuevo usuario en el sistema.
 *       Por defecto, el rol será 'guest' a menos que se especifique otro.
 *       **Nota**: Solo los administradores pueden crear usuarios con rol 'admin'.
 *     operationId: register
 *     requestBody:
 *       required: true
 *       description: Datos del nuevo usuario
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre completo del usuario
 *                 example: "Juan Pérez"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email único del usuario
 *                 example: "juan@ejemplo.com"
 *               password:
 *                 type: string
 *                 description: Contraseña (mínimo 6 caracteres)
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 description: Nombre del rol (debe existir previamente)
 *                 enum: [admin, editor, guest]
 *                 example: "guest"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación (email ya existe o datos inválidos)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'guest' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, email y contraseña requeridos' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const roleRecord = await Role.findOne({ where: { name: role } });
    const roleId = roleRecord ? roleRecord.id : null;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role_id: roleId,
      status: true
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const userWithRole = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'roleData' }]
    });

    const userResponse = userWithRole.toJSON();
    delete userResponse.password;

    res.status(201).json({ success: true, token, user: userResponse });
  } catch (error) {
    console.error('API Error register:', error);
    res.status(500).json({ success: false, message: 'Error al registrar usuario' });
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar recuperación de contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Si el email existe, recibirá el enlace
 *       400:
 *         description: Email requerido
 */
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'El email es requerido' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ success: true, message: 'Si el email existe, recibirá un enlace de recuperación' });
    }

    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { sequelize } = await import('../database/models/User.js');
    
    await sequelize.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at, updated_at) 
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      { replacements: [user.id, token, expiresAt] }
    );

    const resetLink = `${req.protocol}://${req.get('host')}/auth/reset-password/${token}`;
    console.log(`🔗 Password Reset Link: ${resetLink}`);

    res.json({ success: true, message: 'Si el email existe, recibirá un enlace de recuperación' });
  } catch (error) {
    console.error('API Error forgot password:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Restablecer contraseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirm_password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               confirm_password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Error en la validación
 */
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password, confirm_password } = req.body;

    if (!token || !password || !confirm_password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const { sequelize } = await import('../database/models/User.js');
    
    const [tokenRecord] = await sequelize.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND used = false AND expires_at > datetime('now') 
       LIMIT 1`,
      { replacements: [token] }
    );

    if (!tokenRecord || tokenRecord.length === 0) {
      return res.status(400).json({ success: false, message: 'El enlace de recuperación ha expirado o es inválido' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await sequelize.query(
      `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`,
      { replacements: [hashedPassword, tokenRecord[0].user_id] }
    );

    await sequelize.query(
      `UPDATE password_reset_tokens SET used = true, updated_at = datetime('now') WHERE id = ?`,
      { replacements: [tokenRecord[0].id] }
    );

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('API Error reset password:', error);
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Obtener usuario actual
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 *       401:
 *         description: No autorizado
 */
router.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token requerido' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('API Error me:', error);
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Obtener lista de usuarios
 *     description: |
 *       Retorna una lista paginada de usuarios.
 *       Soporta filtrado por búsqueda (nombre o email) y por rol.
 *     operationId: getUsers
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Número de página
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - name: limit
 *         in: query
 *         description: Cantidad de registros por página
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *       - name: search
 *         in: query
 *         description: Buscar por nombre o email
 *         schema:
 *           type: string
 *           example: "juan"
 *       - name: role
 *         in: query
 *         description: Filtrar por nombre de rol
 *         schema:
 *           type: string
 *           enum: [admin, editor, guest]
 *           example: "guest"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   name: "Administrador"
 *                   email: "admin@adminjs.com"
 *                   role_id: 1
 *                   status: true
 *                   phone: "+51 999 999 999"
 *                   roleData:
 *                     id: 1
 *                     name: "admin"
 *                     description: "Administrador con acceso completo"
 *               pagination:
 *                 total: 15
 *                 page: 1
 *                 limit: 10
 *                 pages: 2
 *       401:
 *         description: No autorizado (token inválido o faltante)
 *   post:
 *     tags: [Users]
 *     summary: Crear usuario
 *     description: |
 *       Crea un nuevo usuario en el sistema.
 *       El rol por defecto es 'guest' si no se especifica.
 *       El email debe ser único en el sistema.
 *     operationId: createUser
 *     requestBody:
 *       required: true
 *       description: Datos del usuario a crear
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *           example:
 *             name: "Nuevo Usuario"
 *             email: "nuevo@ejemplo.com"
 *             password: "password123"
 *             role: "guest"
 *             phone: "+51 999 999 999"
 *             status: true
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Error de validación (email duplicado, datos inválidos)
 *       401:
 *         description: No autorizado
 */
router.get('/users', authApi, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (role) {
      where.role = role;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ model: Role, as: 'roleData' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['id', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('API Error listing users:', error);
    res.status(500).json({ success: false, message: 'Error al listar usuarios' });
  }
});

router.post('/users', authApi, async (req, res) => {
  try {
    const { name, email, password, role = 'guest', phone, avatar, status = true } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const roleRecord = await Role.findOne({ where: { name: role } });
    const roleId = roleRecord ? roleRecord.id : null;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role_id: roleId,
      phone,
      avatar,
      status
    });

    const userWithRole = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'roleData' }]
    });

    const userResponse = userWithRole.toJSON();
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    console.error('API Error creating user:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Error al crear usuario' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Obtener usuario por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: Usuario no encontrado
 *   put:
 *     tags: [Users]
 *     summary: Actualizar usuario
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *               status:
 *                 type: boolean
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       404:
 *         description: Usuario no encontrado
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar usuario
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/users/:id', authApi, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('API Error getting user:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuario' });
  }
});

router.put('/users/:id', authApi, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const { name, email, password, role, phone, avatar, status } = req.body;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'El email ya está registrado' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    if (role) {
      const roleRecord = await Role.findOne({ where: { name: role } });
      updateData.role_id = roleRecord ? roleRecord.id : null;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (status !== undefined) updateData.status = status;

    await user.update(updateData);

    const userWithRole = await User.findByPk(user.id, {
      include: [{ model: Role, as: 'roleData' }]
    });

    const userResponse = userWithRole.toJSON();
    delete userResponse.password;

    res.json({ success: true, data: userResponse });
  } catch (error) {
    console.error('API Error updating user:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
  }
});

router.delete('/users/:id', authApi, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    await user.destroy();

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('API Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
  }
});

/**
 * @swagger
 * /api/media:
 *   get:
 *     tags: [Media]
 *     summary: Obtener lista de medios
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *           enum: [all, image, video, audio, document, other]
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de medios
 */
router.get('/media', authApi, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all', search = '' } = req.query;

    const where = {};

    if (type !== 'all') {
      where.type = type;
    }

    if (search) {
      where[Op.or] = [
        { filename: { [Op.like]: `%${search}%` } },
        { alt_text: { [Op.like]: `%${search}%` } },
        { caption: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Media.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['id', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('API Error listing media:', error);
    res.status(500).json({ success: false, message: 'Error al listar medios' });
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     tags: [Media]
 *     summary: Obtener medio por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Medio encontrado
 *       404:
 *         description: Medio no encontrado
 */
router.get('/media/:id', authApi, async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);

    if (!media) {
      return res.status(404).json({ success: false, message: 'Medio no encontrado' });
    }

    res.json({ success: true, data: media });
  } catch (error) {
    console.error('API Error getting media:', error);
    res.status(500).json({ success: false, message: 'Error al obtener medio' });
  }
});

import * as roleApiController from '../controllers/api/roleApiController.js';

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Obtener lista de roles
 *     description: Retorna todos los roles con sus permisos asociados
 *     operationId: getRoles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   name: "admin"
 *                   description: "Administrador con acceso completo"
 *                   permissions:
 *                     - id: 1
 *                       key: "browse_admin"
 *                       table_name: null
 *                     - id: 2
 *                       key: "browse_users"
 *                       table_name: "users"
 *       401:
 *         description: No autorizado
 *   post:
 *     tags: [Roles]
 *     summary: Crear nuevo rol
 *     description: |
 *       Crea un nuevo rol en el sistema.
 *       Los permisos se asignan mediante un array de IDs de permisos.
 *       Para obtener la lista de permisos disponibles, usa GET /api/permissions
 *     operationId: createRole
 *     requestBody:
 *       required: true
 *       description: Datos del rol a crear
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleCreate'
 *           example:
 *             name: "manager"
 *             description: "Gerente del sistema"
 *             permissions: [1, 2, 3, 4, 5]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Rol creado exitosamente
 *       400:
 *         description: Error de validación (nombre duplicado)
 *       401:
 *         description: No autorizado
 */
router.get('/roles', authApi, roleApiController.index);
router.post('/roles', authApi, roleApiController.store);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Obtener rol por ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rol encontrado
 *       404:
 *         description: Rol no encontrado
 *   put:
 *     tags: [Roles]
 *     summary: Actualizar rol
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rol actualizado
 *       404:
 *         description: Rol no encontrado
 *   delete:
 *     tags: [Roles]
 *     summary: Eliminar rol
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rol eliminado
 *       404:
 *         description: Rol no encontrado
 */
router.get('/roles/:id', authApi, roleApiController.show);
router.put('/roles/:id', authApi, roleApiController.update);
router.delete('/roles/:id', authApi, roleApiController.remove);

/**
 * @swagger
 * /api/roles/generate:
 *   post:
 *     tags: [Roles]
 *     summary: Generar permisos para un recurso
 *     description: |
 *       Genera automáticamente los 5 permisos estándar CRUD para un recurso/tabla:
 *       - **browse_** - Ver lista
 *       - **read_** - Ver detalle
 *       - **add_** - Crear
 *       - **edit_** - Editar
 *       - **delete_** - Eliminar
 *       
 *       Por ejemplo, si table_name es "products", creará:
 *       - browse_products
 *       - read_products
 *       - add_products
 *       - edit_products
 *       - delete_products
 *     operationId: generatePermissions
 *     requestBody:
 *       required: true
 *       description: Nombre del recurso para generar permisos
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GeneratePermissionsRequest'
 *           example:
 *             table_name: "products"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Permisos generados
 *       400:
 *         description: Error de validación
 */
router.post('/roles/generate', authApi, roleApiController.generate);

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     tags: [Roles]
 *     summary: Obtener lista de permisos
 *     description: |
 *       Retorna todos los permisos disponibles en el sistema.
 *       Úsalo para obtener los IDs de permisos antes de crear o actualizar un rol.
 *       
 *       **Flujo típico para crear un rol con permisos:**
 *       1. GET /api/permissions - Obtener lista de permisos disponibles
 *       2. POST /api/roles - Crear rol con array de permission IDs
 *     operationId: getPermissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de permisos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   key: "browse_admin"
 *                   table_name: null
 *                 - id: 2
 *                   key: "browse_users"
 *                   table_name: "users"
 *                 - id: 3
 *                   key: "read_users"
 *                   table_name: "users"
 *       401:
 *         description: No autorizado
 */
router.get('/permissions', authApi, roleApiController.getPermissions);

export default router;
