export const up = async (queryInterface, Sequelize) => {
  const permissionsData = [
    { key: 'browse_admin', table_name: null },
    { key: 'browse_users', table_name: 'users' },
    { key: 'read_users', table_name: 'users' },
    { key: 'add_users', table_name: 'users' },
    { key: 'edit_users', table_name: 'users' },
    { key: 'delete_users', table_name: 'users' },
    { key: 'browse_media', table_name: 'media' },
    { key: 'read_media', table_name: 'media' },
    { key: 'add_media', table_name: 'media' },
    { key: 'edit_media', table_name: 'media' },
    { key: 'delete_media', table_name: 'media' },
    { key: 'browse_roles', table_name: 'roles' },
    { key: 'read_roles', table_name: 'roles' },
    { key: 'add_roles', table_name: 'roles' },
    { key: 'edit_roles', table_name: 'roles' },
    { key: 'delete_roles', table_name: 'roles' },
    { key: 'browse_permissions', table_name: 'permissions' },
  ];

  await queryInterface.bulkInsert(
    'permissions',
    permissionsData.map(p => ({
      ...p,
      created_at: new Date(),
      updated_at: new Date()
    }))
  );

  const permissions = await queryInterface.sequelize.query(
    "SELECT id, key FROM permissions",
    { type: Sequelize.QueryTypes.SELECT }
  );

  const permissionMap = {};
  permissions.forEach(p => {
    permissionMap[p.key] = p.id;
  });

  const rolesData = [
    {
      name: 'admin',
      description: 'Administrador con acceso completo',
      permissions: Object.keys(permissionMap)
    },
    {
      name: 'editor',
      description: 'Editor puede crear y editar pero no eliminar',
      permissions: [
        'browse_admin',
        'browse_users', 'read_users', 'add_users', 'edit_users',
        'browse_media', 'read_media', 'add_media', 'edit_media'
      ]
    },
    {
      name: 'guest',
      description: 'Solo lectura',
      permissions: [
        'browse_admin',
        'browse_users', 'read_users',
        'browse_media', 'read_media'
      ]
    }
  ];

  for (const roleData of rolesData) {
    const { name, description, permissions: perms } = roleData;
    
    await queryInterface.bulkInsert('roles', [{
      name,
      description,
      created_at: new Date(),
      updated_at: new Date()
    }]);

    const [role] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = '${name}'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (role) {
      const rolePermIds = perms.map(permKey => permissionMap[permKey]).filter(Boolean);
      
      if (rolePermIds.length > 0) {
        const rolePermData = rolePermIds.map(permId => ({
          role_id: role.id,
          permission_id: permId,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await queryInterface.bulkInsert('role_permissions', rolePermData);
      }
    }
  }

  const adminRole = await queryInterface.sequelize.query(
    "SELECT id FROM roles WHERE name = 'admin'",
    { type: Sequelize.QueryTypes.SELECT }
  );

  if (adminRole && adminRole.length > 0) {
    await queryInterface.sequelize.query(
      `UPDATE users SET role_id = ${adminRole[0].id} WHERE role = 'admin'`
    );
  }

  console.log('✅ Seed roles and permissions completed');
};

export const down = async (queryInterface) => {
  await queryInterface.bulkDelete('role_permissions', null, {});
  await queryInterface.bulkDelete('roles', null, {});
  await queryInterface.bulkDelete('permissions', null, {});
};
