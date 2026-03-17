import sequelize from '../../config/database.js';
import { DataTypes } from 'sequelize';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El nombre es requerido' },
      len: {
        args: [2, 100],
        msg: 'El nombre debe tener entre 2 y 100 caracteres'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: { msg: 'El email ya está registrado' },
    validate: {
      notEmpty: { msg: 'El email es requerido' },
      isEmail: { msg: 'Debe ser un email válido' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'La contraseña es requerida' },
      len: {
        args: [6, 100],
        msg: 'La contraseña debe tener entre 6 y 100 caracteres'
      }
    }
  },
  role_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'roles',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: {
        args: [0, 20],
        msg: 'El teléfono debe tener máximo 20 caracteres'
      }
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

User.associate = function(models) {
  User.belongsTo(models.Role, {
    foreignKey: 'role_id',
    as: 'roleData'
  });
};

export { sequelize, User };
