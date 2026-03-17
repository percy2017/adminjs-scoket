import { User, Role, Permission } from '../database/models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import { validationResult } from 'express-validator';

export const userValidationRules = {
  create: [
    (req, res, next) => {
      const { name, email, password, role } = req.body;
      const errors = [];
      
      if (!name || name.trim().length < 2) {
        errors.push('El nombre es requerido y debe tener al menos 2 caracteres');
      }
      if (!email || !email.includes('@')) {
        errors.push('El email es requerido y debe ser válido');
      }
      if (!password || password.length < 6) {
        errors.push('La contraseña es requerida y debe tener al menos 6 caracteres');
      }
      
      if (errors.length > 0) {
        const oldData = { name, email, phone: req.body.phone, role, status: req.body.status, avatar: req.body.avatar };
        return res.renderWithLayout('admin/users/edit', {
          title: 'Nuevo Usuario',
          user: oldData,
          errors,
          buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
        });
      }
      next();
    }
  ],
  update: [
    (req, res, next) => {
      const { name, email, role } = req.body;
      const errors = [];
      
      if (!name || name.trim().length < 2) {
        errors.push('El nombre es requerido y debe tener al menos 2 caracteres');
      }
      if (!email || !email.includes('@')) {
        errors.push('El email es requerido y debe ser válido');
      }
      
      if (errors.length > 0) {
        const oldData = { 
          id: req.params.id,
          name, 
          email, 
          phone: req.body.phone, 
          role, 
          status: req.body.status, 
          avatar: req.body.avatar 
        };
        return res.renderWithLayout('admin/users/edit', {
          title: 'Editar Usuario',
          user: oldData,
          errors,
          buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
        });
      }
      next();
    }
  ]
};

export const validateUser = [
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const oldData = {
        name: req.body.name || '',
        email: req.body.email || '',
        phone: req.body.phone || '',
        role: req.body.role || 'guest',
        status: req.body.status || '1',
        avatar: req.body.avatar || ''
      };
      const errorMessages = errors.array().map(err => err.msg);
      
      if (req.params.id) {
        return res.renderWithLayout('admin/users/edit', {
          title: 'Editar Usuario',
          user: { ...oldData, id: req.params.id },
          errors: errorMessages,
          buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
        });
      } else {
        return res.renderWithLayout('admin/users/edit', {
          title: 'Nuevo Usuario',
          user: oldData,
          errors: errorMessages,
          buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
        });
      }
    }
    next();
  }
];

export const index = async (req, res) => {
  try {
    const user = await User.findByPk(req.session.user.id, {
      include: [{ model: Role, as: 'roleData', include: [{ model: Permission, as: 'permissions' }] }]
    });

    const userPermissions = user && user.roleData && user.roleData.permissions 
      ? user.roleData.permissions.map(p => p.key)
      : [];
    
    const canAdd = userPermissions.includes('add_users') || userPermissions.length === 0;
    const canEdit = userPermissions.includes('edit_users') || userPermissions.length === 0;
    const canDelete = userPermissions.includes('delete_users') || userPermissions.length === 0;

    const users = await User.findAll({
      order: [['id', 'DESC']],
      include: [{ model: Role, as: 'roleData' }]
    });

    res.renderWithLayout('admin/users/index', { 
      title: 'Usuarios',
      users,
      canAdd,
      canEdit,
      canDelete,
      buttons: canAdd ? '<a href="/admin/users/new" class="btn btn-sm btn-primary"><i class="bi bi-plus-circle"></i> Nuevo Usuario</a>' : ''
    });
  } catch (error) {
    console.error('Error listing users:', error);
    req.flash('error_msg', 'Error al listar usuarios');
    res.redirect('/admin');
  }
};

export const datatables = async (req, res) => {
  try {
    const { draw, start, length, search, order, columns } = req.query;
    
    const searchValue = search?.value || '';
    const limit = parseInt(length) || 10;
    const offset = parseInt(start) || 0;
    
    const columnIndex = order?.[0]?.column || 1;
    const columnDir = order?.[0]?.dir || 'DESC';
    
    const columnMap = { 0: 'id', 1: 'id', 2: 'name', 3: 'email', 4: 'phone', 5: 'role', 6: 'status', 7: 'createdAt' };
    const sortColumn = columnMap[columnIndex] || 'id';
    
    const where = {};
    if (searchValue) {
      where[Op.or] = [
        { name: { [Op.like]: `%${searchValue}%` } },
        { email: { [Op.like]: `%${searchValue}%` } }
      ];
    }
    
    const [recordsTotal, recordsFiltered, users] = await Promise.all([
      User.count(),
      User.count({ where }),
      User.findAll({
        where,
        limit,
        offset,
        order: [[sortColumn, columnDir]],
        attributes: { exclude: ['password'] },
        include: [{ model: Role, as: 'roleData' }]
      })
    ]);
    
    const data = users.map((user) => {
      const u = user.toJSON();
      const roleName = u.roleData?.name || 'Sin rol';
      return [
        u.avatar ? `<img src="${u.avatar}" class="rounded-circle" width="40" height="40">` : '<span class="badge bg-secondary"><i class="bi bi-person"></i></span>',
        u.id,
        u.name,
        u.email,
        u.phone || '-',
        `<span class="badge bg-${roleName === 'admin' ? 'primary' : 'secondary'}">${roleName}</span>`,
        `<span class="badge bg-${u.status ? 'success' : 'danger'}">${u.status ? 'Activo' : 'Inactivo'}</span>`,
        new Date(u.created_at || u.createdAt).toLocaleDateString('es'),
        `<a href="/admin/users/${u.id}/edit" class="btn btn-sm btn-primary"><i class="bi bi-pencil"></i></a>
         <button onclick="confirmDelete(${u.id}, '${u.name.replace(/'/g, "\\'")}')" class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>`
      ];
    });
    
    res.json({
      draw: parseInt(draw),
      recordsTotal,
      recordsFiltered,
      data
    });
  } catch (error) {
    console.error('Error in datatables:', error);
    res.status(500).json({ error: 'Error loading data' });
  }
};

export const create = async (req, res) => {
  const roles = await Role.findAll({ order: [['name', 'ASC']] });
  res.renderWithLayout('admin/users/edit', {
    title: 'Nuevo Usuario',
    user: null,
    roles,
    buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
  });
};

export const store = async (req, res) => {
  try {
    const { name, email, password, role_id, status, avatar, phone } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const oldData = { name, email, phone, role_id, status, avatar };
      const roles = await Role.findAll({ order: [['name', 'ASC']] });
      return res.renderWithLayout('admin/users/edit', {
        title: 'Nuevo Usuario',
        user: oldData,
        roles,
        errors: ['El email ya está registrado'],
        buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role_id: role_id || null,
      status: status == '1',
      avatar: avatar || null,
      phone: phone || null
    });

    const userResponse = user.toJSON();
    delete userResponse.password;
    
    const io = req.app.get('io');
    if (io) {
      io.emit('user:created', userResponse);
    }

    req.flash('success_msg', 'Usuario creado correctamente');
    
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.json({ success: true, message: 'Usuario creado correctamente', user: userResponse });
    }
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    const roles = await Role.findAll({ order: [['name', 'ASC']] });
    const oldData = { name: req.body.name, email: req.body.email, phone: req.body.phone, role_id: req.body.role_id, status: req.body.status, avatar: req.body.avatar };
    return res.renderWithLayout('admin/users/edit', {
      title: 'Nuevo Usuario',
      user: oldData,
      roles,
      errors: ['Error al crear usuario. Verifica los datos ingresados.'],
      buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
    });
  }
};

export const edit = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Role, as: 'roleData' }]
    });

    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/users');
    }

    const roles = await Role.findAll({ order: [['name', 'ASC']] });

    res.renderWithLayout('admin/users/edit', {
      title: 'Editar Usuario',
      user,
      roles,
      buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
    });
  } catch (error) {
    console.error('Error editing user:', error);
    req.flash('error_msg', 'Error al cargar usuario');
    res.redirect('/admin/users');
  }
};

export const update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/users');
    }

    const { name, email, password, role_id, status, avatar, phone } = req.body;

    const phoneValue = phone && phone.trim ? phone.trim() : phone;
    const statusValue = Array.isArray(status) ? status[status.length - 1] : status;

    if (email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        const roles = await Role.findAll({ order: [['name', 'ASC']] });
        const oldData = { id: user.id, name, email, phone: phoneValue, role_id, status: statusValue, avatar };
        return res.renderWithLayout('admin/users/edit', {
          title: 'Editar Usuario',
          user: oldData,
          roles,
          errors: ['El email ya está registrado'],
          buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
        });
      }
    }

    const updateData = {
      name,
      email,
      role_id: role_id || null,
      status: statusValue == '1',
      avatar: avatar || null,
      phone: phoneValue || null
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await user.update(updateData);

    const userResponse = user.toJSON();
    delete userResponse.password;
    
    const io = req.app.get('io');
    if (io) {
      io.emit('user:updated', userResponse);
    }

    req.flash('success_msg', 'Usuario actualizado correctamente');
    
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.json({ success: true, message: 'Usuario actualizado correctamente', user: userResponse });
    }
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    const roles = await Role.findAll({ order: [['name', 'ASC']] });
    const oldData = { 
      id: req.params.id,
      name: req.body.name, 
      email: req.body.email, 
      phone: req.body.phone, 
      role_id: req.body.role_id, 
      status: req.body.status, 
      avatar: req.body.avatar 
    };
    return res.renderWithLayout('admin/users/edit', {
      title: 'Editar Usuario',
      user: oldData,
      roles,
      errors: ['Error al actualizar usuario. Verifica los datos ingresados.'],
      buttons: '<a href="/admin/users" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
    });
  }
};

export const remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin/users');
    }

    if (user.id === 1) {
      const isAjax = req.xhr || req.headers.accept?.includes('json');
      if (isAjax) {
        return res.status(403).json({ success: false, message: 'No puedes eliminar el usuario administrador principal' });
      }
      req.flash('error_msg', 'No puedes eliminar el usuario administrador principal');
      return res.redirect('/admin/users');
    }

    const userId = user.id;
    await user.destroy();
    
    const io = req.app.get('io');
    if (io) {
      io.emit('user:deleted', { id: userId });
    }

    req.flash('success_msg', 'Usuario eliminado correctamente');
    
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.json({ success: true, message: 'Usuario eliminado correctamente', id: userId });
    }
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
    req.flash('error_msg', 'Error al eliminar usuario');
    res.redirect('/admin/users');
  }
};
