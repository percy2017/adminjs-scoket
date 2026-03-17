export const up = async (queryInterface, DataTypes) => {
  await queryInterface.addColumn('users', 'role_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'roles',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });

  await queryInterface.addIndex('users', ['role_id']);
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn('users', 'role_id');
};
