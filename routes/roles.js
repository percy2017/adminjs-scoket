import express from 'express';
import { isAuthenticated, can } from '../middleware/auth.js';
import * as roleController from '../controllers/roleController.js';

const router = express.Router();

router.get('/roles', isAuthenticated, can('browse_roles'), roleController.index);
router.get('/roles/new', isAuthenticated, can('add_roles'), roleController.create);
router.post('/roles', isAuthenticated, can('add_roles'), roleController.store);
router.get('/roles/:id/edit', isAuthenticated, can('edit_roles'), roleController.edit);
router.put('/roles/:id', isAuthenticated, can('edit_roles'), roleController.update);
router.delete('/roles/:id', isAuthenticated, can('delete_roles'), roleController.remove);
router.post('/roles/generate', isAuthenticated, can('add_roles'), roleController.generate);

export default router;
