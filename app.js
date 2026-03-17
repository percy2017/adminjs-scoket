import 'dotenv/config';
import createError from 'http-errors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import flash from 'connect-flash';
import cors from 'cors';
import config from './config/app.js';
import methodOverride from 'method-override';
import expressLayouts from 'express-ejs-layouts';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerOptions from './config/swagger.js';

const specs = swaggerJsdoc(swaggerOptions);

import indexRouter from './routes/index.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import adminApiRouter from './routes/admin-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const getTimestamp = () => new Date().toLocaleTimeString('es-ES', { hour12: false });

app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  res.send = function(data) {
    originalSend.call(this, data);
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = status >= 400 ? '\x1b[31m' : '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(`${getTimestamp()} │ ${color}${status}${reset} │ ${req.method} ${req.url} │ ${duration}ms`);
  };
  next();
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout-frontend');
app.use(expressLayouts);

app.use((req, res, next) => {
  res.renderWithLayout = (view, options = {}, callback) => {
    const defaultOptions = {
      ...options,
      layout: 'layout-backend',
      buttons: options.buttons || '',
      styles: options.styles || '',
      scripts: options.scripts || ''
    };
    
    if (callback) {
      res.render(view, defaultOptions, callback);
    } else {
      res.render(view, defaultOptions);
    }
  };
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(methodOverride('_method'));


app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: config.session.secret,
  resave: config.session.resave,
  saveUninitialized: config.session.saveUninitialized,
  cookie: config.session.cookie
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
  next();
});

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/api', adminApiRouter);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.get('/swagger.json', (req, res) => {
  res.json(specs);
});

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  const status = err.status || 500;
  const isDev = req.app.get('env') === 'development';
  
  if (isDev) {
    console.error('┌─────────────────────────────────────');
    console.error('│ 🚨 ERROR DETECTADO');
    console.error('├─────────────────────────────────────');
    console.error(`│ ${status} - ${err.message}`);
    //console.error(`│ ${req.method} ${req.url}`);
    if (err.stack) {
      const stackLines = err.stack.split('\n').slice(1, 4);
      stackLines.forEach(line => {
        console.error(`│ ${line.trim()}`);
      });
    }
    console.error('└─────────────────────────────────────');
  } else {
    console.error(`ERROR: ${status} - ${err.message} | ${req.method} ${req.url}`);
  }

  res.status(status);
  res.render('error', { layout: 'layout-backend', message: err.message, error: err });
});

export default app;
