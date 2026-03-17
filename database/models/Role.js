import sequelize from '../../config/database.js';
import { DataTypes } from 'sequelize';

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      msg: 'El nombre del rol ya existe'
    },
    validate: {
      notEmpty: { msg: 'El nombre del rol es requerido' }
    }
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'roles',
  timestamps: true,
  underscored: true
});

Role.associate = function(models) {
  Role.belongsToMany(models.Permission, {
    through: 'role_permissions',
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions'
  });
  
  Role.hasMany(models.User, {
    foreignKey: 'role_id',
    as: 'users'
  });
};

export { sequelize, Role };
