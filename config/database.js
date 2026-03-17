import 'dotenv/config';
import { Sequelize } from 'sequelize';

const env = process.env.DB_CONNECTION || 'sqlite';

const getDatabaseConfig = () => {
  const configs = {
    sqlite: {
      dialect: 'sqlite',
      storage: process.env.DB_DATABASE || './database/adminjs.sqlite',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
      }
    },
    mysql: {
      dialect: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_DATABASE || 'adminjs',
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
      }
    },
    postgres: {
      dialect: 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_DATABASE || 'adminjs',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
      }
    }
  };

  return configs[env] || configs.sqlite;
};

const sequelize = new Sequelize(getDatabaseConfig());

export default sequelize;
