import { Media } from '../database/models/Media.js';
import { Op } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const index = async (req, res) => {
  try {
    const type = req.query.type || 'all';
    const search = req.query.search || '';
    const picker = req.query.picker === '1';
    
    let where = {};
    
    if (type !== 'all') {
      where.type = type;
    }
    
    if (search) {
      where[Op.or] = [
        { filename: { [Op.like]: `%${search}%` } },
        { alt_text: { [Op.like]: `%${search}%` } },
        { caption: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const media = await Media.findAll({
      where,
      order: [['id', 'DESC']]
    });
    
    if (picker) {
      return res.render('admin/media/picker', { title: 'Seleccionar medio', media, filters: { type, search } });
    }
    
    res.renderWithLayout('admin/media/index', {
      title: 'Medios',
      media,
      filters: { type, search }
    });
  } catch (error) {
    console.error('Error loading media:', error);
    req.flash('error_msg', 'Error al cargar medios');
    res.redirect('/admin');
  }
};

export const create = (req, res) => {
  res.renderWithLayout('admin/media/edit', {
    title: 'Subir Medio',
    media: null
  });
};

export const store = async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'No se ha seleccionado ningún archivo');
      return res.redirect(req.query.picker ? '/admin/media?picker=1' : '/admin/media');
    }
    
    const file = req.file;
    const mimeType = file.mimetype;
    
    let type = 'other';
    if (mimeType.startsWith('image/')) type = 'image';
    else if (mimeType.startsWith('video/')) type = 'video';
    else if (mimeType.startsWith('audio/')) type = 'audio';
    else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) type = 'document';
    
    const media = await Media.create({
      filename: file.filename,
      original_name: file.originalname,
      mime_type: mimeType,
      extension: path.extname(file.originalname).toLowerCase(),
      size: file.size,
      path: file.path,
      url: `/uploads/${file.filename}`,
      type,
      user_id: req.session.user.id
    });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('media:created', media.toJSON());
    }
    
    req.flash('success_msg', 'Medio subido correctamente');
    
    if (req.query.picker) {
      return res.redirect('/admin/media?picker=1');
    }
    res.redirect('/admin/media');
  } catch (error) {
    console.error('Error uploading media:', error);
    req.flash('error_msg', 'Error al subir medio');
    res.redirect(req.query.picker ? '/admin/media?picker=1' : '/admin/media');
  }
};

export const edit = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }]
    });
    
    if (!media) {
      req.flash('error_msg', 'Medio no encontrado');
      return res.redirect('/admin/media');
    }
    
    res.renderWithLayout('admin/media/edit', {
      title: 'Editar Medio',
      media
    });
  } catch (error) {
    console.error('Error loading media:', error);
    req.flash('error_msg', 'Error al cargar medio');
    res.redirect('/admin/media');
  }
};

export const show = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'name'] }]
    });
    
    if (!media) {
      return res.status(404).send('Medio no encontrado');
    }
    
    res.render('admin/media/sidebar', { media, layout: false });
  } catch (error) {
    console.error('Error loading media:', error);
    res.status(500).send('Error al cargar medio');
  }
};

export const update = async (req, res) => {
  try {
    const media = await Media.findByPk(req.params.id);
    
    if (!media) {
      req.flash('error_msg', 'Medio no encontrado');
      return res.redirect('/admin/media');
    }
    
    const { alt_text, caption, description } = req.body;
    
    await media.update({
      alt_text: alt_text || null,
      caption: caption || null,
      description: description || null
    });
    
    const accept = req.headers.accept || '';
    if (accept.includes('application/json')) {
      return res.json({ success: true, message: 'Medio actualizado correctamente' });
    }
    
    req.flash('success_msg', 'Medio actualizado correctamente');
    res.redirect('/admin/media');
  } catch (error) {
    console.error('Error updating media:', error);
    req.flash('error_msg', 'Error al actualizar medio');
    res.redirect(`/admin/media/${req.params.id}/edit`);
  }
};

export const remove = async (req, res) => {
  console.log('DELETE media called, params:', req.params);
  try {
    const media = await Media.findByPk(req.params.id);
    
    if (!media) {
      console.log('Media not found');
      if (req.headers.accept?.includes('application/json')) {
        return res.status(404).json({ success: false, message: 'Medio no encontrado' });
      }
      req.flash('error_msg', 'Medio no encontrado');
      return res.redirect('/admin/media');
    }
    
    const filePath = media.path;
    console.log('Deleting file:', filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await media.destroy();
    console.log('Media deleted successfully');
    
    if (req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, message: 'Medio eliminado correctamente' });
    }
    
    req.flash('success_msg', 'Medio eliminado correctamente');
    res.redirect('/admin/media');
  } catch (error) {
    console.error('Error deleting media:', error);
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ success: false, message: 'Error al eliminar medio' });
    }
    req.flash('error_msg', 'Error al eliminar medio');
    res.redirect('/admin/media');
  }
};
