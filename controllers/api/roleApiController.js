import { Role, Permission, User } from '../../database/models/index.js';

export const index = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, as: 'permissions' }],
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('API Error listing roles:', error);
    res.status(500).json({ success: false, message: 'Error al listar roles' });
  }
};

export const show = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [{ model: Permission, as: 'permissions' }]
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado' });
    }

    res.json({ success: true, data: role });
  } catch (error) {
    console.error('API Error getting role:', error);
    res.status(500).json({ success: false, message: 'Error al obtener rol' });
  }
};

export const store = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del rol es requerido' });
    }

    const existingRole = await Role.findOne({ where: { name } });
    if (existingRole) {
      return res.status(400).json({ success: false, message: 'El nombre del rol ya existe' });
    }

    const role = await Role.create({
      name: name.trim(),
      description: description || null
    });

    if (permissions) {
      const permIds = Array.isArray(permissions) ? permissions : [permissions];
      if (permIds.length > 0) {
        await role.setPermissions(permIds);
      }
    }

    const roleWithPermissions = await Role.findByPk(role.id, {
      include: [{ model: Permission, as: 'permissions' }]
    });

    res.status(201).json({ success: true, data: roleWithPermissions });
  } catch (error) {
    console.error('API Error creating role:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Error al crear rol' });
  }
};

export const update = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado' });
    }

    if (role.name === 'admin') {
      return res.status(403).json({ success: false, message: 'No puedes modificar el rol administrador' });
    }

    const { name, description, permissions } = req.body;

    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        return res.status(400).json({ success: false, message: 'El nombre del rol ya existe' });
      }
    }

    await role.update({
      name: name ? name.trim() : role.name,
      description: description !== undefined ? description : role.description
    });

    if (permissions !== undefined) {
      const permIds = Array.isArray(permissions) ? permissions : [permissions];
      await role.setPermissions(permIds);
    }

    const roleWithPermissions = await Role.findByPk(role.id, {
      include: [{ model: Permission, as: 'permissions' }]
    });

    res.json({ success: true, data: roleWithPermissions });
  } catch (error) {
    console.error('API Error updating role:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar rol' });
  }
};

export const remove = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado' });
    }

    if (role.name === 'admin') {
      return res.status(403).json({ success: false, message: 'No puedes eliminar el rol administrador' });
    }

    const usersWithRole = await User.count({ where: { role_id: role.id } });
    if (usersWithRole > 0) {
      return res.status(403).json({ success: false, message: `No puedes eliminar este rol porque hay ${usersWithRole} usuarios用它` });
    }

    await role.destroy();

    res.json({ success: true, message: 'Rol eliminado correctamente' });
  } catch (error) {
    console.error('API Error deleting role:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar rol' });
  }
};

export const generate = async (req, res) => {
  try {
    const { table_name } = req.body;

    if (!table_name || table_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'El nombre del recurso es requerido' });
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

    res.json({
      success: true,
      message: `Se crearon ${newPermissions.length} permisos para ${resource}`,
      permissions: newPermissions
    });
  } catch (error) {
    console.error('API Error generating permissions:', error);
    res.status(500).json({ success: false, message: 'Error al generar permisos' });
  }
};

export const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [['table_name', 'ASC'], ['key', 'ASC']]
    });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('API Error listing permissions:', error);
    res.status(500).json({ success: false, message: 'Error al listar permisos' });
  }
};
