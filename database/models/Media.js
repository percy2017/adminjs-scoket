import sequelize from '../../config/database.js';
import { DataTypes } from 'sequelize';

const Media = sequelize.define('Media', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  original_name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'original_name'
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'mime_type'
  },
  extension: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  alt_text: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'alt_text'
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('image', 'video', 'audio', 'document', 'other'),
    defaultValue: 'other'
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'media',
  timestamps: true,
  underscored: true
});

export { sequelize, Media };
