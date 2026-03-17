import { User } from '../../database/models/User.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

export const index = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (role) {
      where.role = role;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['id', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('API Error listing users:', error);
    res.status(500).json({ success: false, message: 'Error al listar usuarios' });
  }
};

export const show = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('API Error getting user:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuario' });
  }
};

export const store = async (req, res) => {
  try {
    const { name, email, password, role = 'guest', phone, avatar, status = true } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      avatar,
      status
    });

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    console.error('API Error creating user:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Error al crear usuario' });
  }
};

export const update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const { name, email, password, role, phone, avatar, status } = req.body;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'El email ya está registrado' });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 12);
    if (role) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (status !== undefined) updateData.status = status;

    await user.update(updateData);

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({ success: true, data: userResponse });
  } catch (error) {
    console.error('API Error updating user:', error);
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
  }
};

export const remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    await user.destroy();

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('API Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
  }
};
