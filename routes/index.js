import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.get('/', function(req, res) {
  res.render('public/index', { title: 'AdminJS - CMS' });
});

router.get('/login', function(req, res) {
  res.render('auth/login', { title: 'Login - AdminJS', layout: false });
});

export default router;
