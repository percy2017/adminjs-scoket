import sequelize from '../../config/database.js';
import { DataTypes } from 'sequelize';

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'El permiso ya existe'
    },
    validate: {
      notEmpty: { msg: 'La clave del permiso es requerida' }
    }
  },
  table_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Nombre de la tabla/recurso al que aplica el permiso'
  }
}, {
  tableName: 'permissions',
  timestamps: true,
  underscored: true
});

Permission.associate = function(models) {
  Permission.belongsToMany(models.Role, {
    through: 'role_permissions',
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles'
  });
};

export { sequelize, Permission };
