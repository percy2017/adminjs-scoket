import 'dotenv/config';

const config = {
  app: {
    name: process.env.APP_NAME || 'AdminJS',
    env: process.env.NODE_ENV || 'development',
    port: process.env.APP_PORT || 3000,
    url: process.env.APP_URL || 'http://localhost:3000'
  },
  db: {
    connection: process.env.DB_CONNECTION || 'sqlite'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  session: {
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
  }
};

export default config;
