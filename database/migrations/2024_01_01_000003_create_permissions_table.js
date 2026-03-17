export const up = async (queryInterface, DataTypes) => {
  await queryInterface.createTable('permissions', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    table_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre de la tabla/recurso al que aplica el permiso'
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

  await queryInterface.addIndex('permissions', ['key']);
  await queryInterface.addIndex('permissions', ['table_name']);
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('permissions');
};
