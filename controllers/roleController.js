import { Role, Permission, User } from '../database/models/index.js';

export const index = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, as: 'permissions' }],
      order: [['id', 'ASC']]
    });

    res.renderWithLayout('admin/roles/index', {
      title: 'Roles',
      roles,
      buttons: '<a href="/admin" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Dashboard</a>'
    });
  } catch (error) {
    console.error('Error listing roles:', error);
    req.flash('error_msg', 'Error al listar roles');
    res.redirect('/admin');
  }
};

export const create = async (req, res) => {
  try {
    const allPermissions = await Permission.findAll({
      order: [['table_name', 'ASC'], ['key', 'ASC']]
    });

    res.renderWithLayout('admin/roles/edit', {
      title: 'Nuevo Rol',
      role: null,
      permissions: [],
      allPermissions,
      buttons: '<a href="/admin/roles" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
    });
  } catch (error) {
    console.error('Error loading create form:', error);
    req.flash('error_msg', 'Error al cargar formulario');
    res.redirect('/admin/roles');
  }
};

export const store = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      const isAjax = req.xhr || req.headers.accept?.includes('json');
      if (isAjax) {
        return res.status(400).json({ success: false, message: 'El nombre del rol ya existe' });
      }
      req.flash('error_msg', 'El nombre del rol ya existe');
      return res.redirect('/admin/roles/new');
    }

    const role = await Role.create({
      name,
      description: description || null
    });

    if (permissions) {
      const permIds = Array.isArray(permissions) ? permissions : [permissions];
      if (permIds.length > 0) {
        await role.setPermissions(permIds);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('role:created', { id: role.id, name: role.name });
    }

    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.json({ success: true, message: 'Rol creado correctamente', roleId: role.id });
    }

    req.flash('success_msg', 'Rol creado correctamente');
    res.redirect('/admin/roles');
  } catch (error) {
    console.error('Error creating role:', error);
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.status(500).json({ success: false, message: 'Error al crear rol' });
    }
    req.flash('error_msg', 'Error al crear rol');
    res.redirect('/admin/roles/new');
  }
};

export const edit = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [{ model: Permission, as: 'permissions' }]
    });

    if (!role) {
      req.flash('error_msg', 'Rol no encontrado');
      return res.redirect('/admin/roles');
    }

    const allPermissions = await Permission.findAll({
      order: [['table_name', 'ASC'], ['key', 'ASC']]
    });

    const rolePermissions = role.permissions.map(p => p.id);

    res.renderWithLayout('admin/roles/edit', {
      title: 'Editar Rol',
      role,
      permissions: rolePermissions,
      allPermissions,
      buttons: '<a href="/admin/roles" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Volver</a>'
    });
  } catch (error) {
    console.error('Error editing role:', error);
    req.flash('error_msg', 'Error al cargar rol');
    res.redirect('/admin/roles');
  }
};

export const update = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      req.flash('error_msg', 'Rol no encontrado');
      return res.redirect('/admin/roles');
    }

    const { name, description, permissions } = req.body;

    if (name !== role.name) {
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        req.flash('error_msg', 'El nombre del rol ya existe');
        return res.redirect(`/admin/roles/${role.id}/edit`);
      }
    }

    await role.update({
      name,
      description: description || null
    });

    if (permissions) {
      const permIds = Array.isArray(permissions) ? permissions : [permissions];
      await role.setPermissions(permIds);
    } else {
      await role.setPermissions([]);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('role:updated', { id: role.id, name: role.name });
    }

    req.flash('success_msg', 'Rol actualizado correctamente');
    res.redirect('/admin/roles');
  } catch (error) {
    console.error('Error updating role:', error);
    req.flash('error_msg', 'Error al actualizar rol');
    res.redirect(`/admin/roles/${req.params.id}/edit`);
  }
};

export const remove = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      const isAjax = req.xhr || req.headers.accept?.includes('json');
      if (isAjax) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }
      req.flash('error_msg', 'Rol no encontrado');
      return res.redirect('/admin/roles');
    }

    if (role.name === 'admin') {
      const isAjax = req.xhr || req.headers.accept?.includes('json');
      if (isAjax) {
        return res.status(403).json({ success: false, message: 'No puedes eliminar el rol administrador' });
      }
      req.flash('error_msg', 'No puedes eliminar el rol administrador');
      return res.redirect('/admin/roles');
    }

    const usersWithRole = await User.count({ where: { role_id: role.id } });
    if (usersWithRole > 0) {
      const isAjax = req.xhr || req.headers.accept?.includes('json');
      if (isAjax) {
        return res.status(403).json({ success: false, message: `No puedes eliminar este rol porque hay ${usersWithRole} usuarios用它` });
      }
      req.flash('error_msg', `No puedes eliminar este rol porque hay ${usersWithRole} usuarios用它`);
      return res.redirect('/admin/roles');
    }

    await role.destroy();

    const io = req.app.get('io');
    if (io) {
      io.emit('role:deleted', { id: role.id });
    }

    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.json({ success: true, message: 'Rol eliminado correctamente', id: role.id });
    }

    req.flash('success_msg', 'Rol eliminado correctamente');
    res.redirect('/admin/roles');
  } catch (error) {
    console.error('Error deleting role:', error);
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.status(500).json({ success: false, message: 'Error al eliminar rol' });
    }
    req.flash('error_msg', 'Error al eliminar rol');
    res.redirect('/admin/roles');
  }
};

export const generate = async (req, res) => {
  try {
    const { table_name } = req.body;

    if (!table_name || table_name.trim() === '') {
      const isAjax = req.xhr || req.headers.accept?.includes('json');
      if (isAjax) {
        return res.status(400).json({ success: false, message: 'El nombre del recurso es requerido' });
      }
      req.flash('error_msg', 'El nombre del recurso es requerido');
      return res.redirect('/admin/roles');
    }

    const resource = table_name.trim().toLowerCase();
    const actions = ['browse', 'read', 'add', 'edit', 'delete'];
    const newPermissions = [];
    const existingPermissions = await Permission.findAll({ where: { table_name: resource } });
    const existingKeys = existingPermissions.map(p => p.key);

    for (const action of actions) {
      const key = `${action}_${resource}`;
      if (!existingKeys.includes(key)) {
        const perm = await Permission.create({ key, table_name: resource });
        newPermissions.push(perm);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('permission:created', { table_name: resource, count: newPermissions.length });
    }

    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.json({ 
        success: true, 
        message: `Se crearon ${newPermissions.length} permisos para ${resource}`,
        permissions: newPermissions
      });
    }

    req.flash('success_msg', `Se crearon ${newPermissions.length} permisos para ${resource}`);
    res.redirect('/admin/roles');
  } catch (error) {
    console.error('Error generating permissions:', error);
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.status(500).json({ success: false, message: 'Error al generar permisos' });
    }
    req.flash('error_msg', 'Error al generar permisos');
    res.redirect('/admin/roles');
  }
};
