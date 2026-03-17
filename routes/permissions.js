import express from 'express';
import { isAuthenticated, can } from '../middleware/auth.js';
import * as permissionController from '../controllers/permissionController.js';

const router = express.Router();

router.get('/permissions', isAuthenticated, can('browse_permissions'), permissionController.index);
router.post('/permissions/generate', isAuthenticated, can('add_roles'), permissionController.generate);

export default router;
