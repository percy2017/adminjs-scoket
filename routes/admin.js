import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { isAuthenticated, can } from '../middleware/auth.js';
import { User } from '../database/models/User.js';
import { Media } from '../database/models/Media.js';
import * as userController from '../controllers/userController.js';
import * as mediaController from '../controllers/mediaController.js';
import rolesRouter from './roles.js';
import permissionsRouter from './permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
  const usersCount = await User.count();
  const mediaCount = await Media.count();
  
  res.renderWithLayout('admin/dashboard', { 
    title: 'Panel',
    usersCount,
    mediaCount
  });
});

router.use(rolesRouter);
router.use(permissionsRouter);

router.get('/users', isAuthenticated, can('browse_users'), userController.index);
router.get('/users/datatables', isAuthenticated, can('browse_users'), userController.datatables);
router.get('/users/new', isAuthenticated, can('add_users'), userController.create);
router.post('/users', isAuthenticated, can('add_users'), userController.userValidationRules.create, userController.store);
router.delete('/users/:id', isAuthenticated, can('delete_users'), userController.remove);
router.get('/users/:id/edit', isAuthenticated, can('edit_users'), userController.edit);
router.get('/users/:id', isAuthenticated, can('edit_users'), userController.edit);
router.post('/users/:id', isAuthenticated, can('edit_users'), userController.userValidationRules.update, userController.update);
router.put('/users/:id', isAuthenticated, can('edit_users'), userController.userValidationRules.update, userController.update);

router.get('/media', isAuthenticated, can('browse_media'), mediaController.index);
router.get('/media/new', isAuthenticated, can('add_media'), mediaController.create);
router.post('/media', isAuthenticated, can('add_media'), upload.single('file'), mediaController.store);
router.get('/media/:id/edit', isAuthenticated, can('edit_media'), mediaController.edit);
router.get('/media/:id', isAuthenticated, can('edit_media'), mediaController.show);
router.put('/media/:id', isAuthenticated, can('edit_media'), mediaController.update);
router.delete('/media/:id', isAuthenticated, can('delete_media'), mediaController.remove);

export default router;
