import { Permission, Role } from '../database/models/index.js';

export const index = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [['table_name', 'ASC'], ['key', 'ASC']]
    });

    const permissionsByTable = permissions.reduce((acc, perm) => {
      const table = perm.table_name || 'global';
      if (!acc[table]) {
        acc[table] = [];
      }
      acc[table].push(perm);
      return acc;
    }, {});

    res.renderWithLayout('admin/permissions/index', {
      title: 'Permisos',
      permissionsByTable,
      buttons: '<a href="/admin" class="btn btn-sm btn-secondary"><i class="bi bi-arrow-left"></i> Dashboard</a>'
    });
  } catch (error) {
    console.error('Error listing permissions:', error);
    req.flash('error_msg', 'Error al listar permisos');
    res.redirect('/admin');
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
      return res.redirect('/admin/permissions');
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
    res.redirect('/admin/permissions');
  } catch (error) {
    console.error('Error generating permissions:', error);
    const isAjax = req.xhr || req.headers.accept?.includes('json');
    if (isAjax) {
      return res.status(500).json({ success: false, message: 'Error al generar permisos' });
    }
    req.flash('error_msg', 'Error al generar permisos');
    res.redirect('/admin/permissions');
  }
};
