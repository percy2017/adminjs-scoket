export const up = async (queryInterface, DataTypes) => {
  await queryInterface.createTable('role_permissions', {
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addConstraint('role_permissions', {
    fields: ['role_id', 'permission_id'],
    type: 'primary key',
    name: 'pk_role_permissions'
  });

  await queryInterface.addIndex('role_permissions', ['role_id']);
  await queryInterface.addIndex('role_permissions', ['permission_id']);
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('role_permissions');
};
