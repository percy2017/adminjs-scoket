import { User } from '../database/models/User.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sequelize } from '../database/models/User.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'mail.hostbol.lat',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: 'info@hostbol.lat',
    pass: 'Info2026$'
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1'
  }
});

const sendPasswordResetEmail = async (email, resetLink) => {
  const from = process.env.SMTP_FROM || 'AdminJS <info@hostbol.lat>';
  
  const mailOptions = {
    from,
    to: email,
    subject: 'Recuperación de contraseña - AdminJS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Recuperación de contraseña</h2>
        <p>Has solicitado recuperar tu contraseña en AdminJS.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Crear nueva contraseña</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Este enlace expirece en 1 hora.<br>
          Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          AdminJS - Panel de Administración
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email de recuperación enviado a: ${email}`);
    console.log(`📧 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    return false;
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash('error_msg', 'Por favor ingresa email y contraseña');
      return res.redirect('/auth/login');
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      req.flash('error_msg', 'Email no registrado');
      return res.redirect('/auth/login');
    }

    if (!user.status) {
      req.flash('error_msg', 'Tu cuenta está deshabilitada');
      return res.redirect('/auth/login');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      req.flash('error_msg', 'Contraseña incorrecta');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', `Bienvenido ${user.name}`);
    res.redirect('/admin');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error_msg', 'Error al iniciar sesión');
    res.redirect('/auth/login');
  }
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};

const showLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin');
  }
  res.render('auth/login', { title: 'Login - AdminJS', layout: null });
};

const showForgotPassword = (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin');
  }
  res.render('auth/forgot-password', { title: 'Recuperar Contraseña - AdminJS', layout: null });
};

const forgotPassword = async (req, res) => {
  try {
    console.log('🔄 Processing forgot password request...');
    const { email } = req.body;

    if (!email) {
      req.flash('error_msg', 'Por favor ingresa tu email');
      return res.redirect('/auth/forgot-password');
    }

    console.log('🔍 Looking for user:', email);
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log('⚠️ User not found');
      req.flash('success_msg', 'Si el email existe, recibirás un enlace de recuperación');
      return res.redirect('/auth/login');
    }

    console.log('✅ User found:', user.name);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    console.log('💾 Creating token in database...');
    await sequelize.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at, updated_at) 
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      { replacements: [user.id, token, expiresAt] }
    );
    console.log('✅ Token created');

    const resetLink = `${req.protocol}://${req.get('host')}/auth/reset-password/${token}`;
    console.log(`🔗 Password Reset Link: ${resetLink}`);

    // Enviar email (si falla, igual se puede usar el link de consola)
    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (emailError) {
      console.error('⚠️ Error enviando email, usando link de consola:', emailError.message);
    }

    req.flash('success_msg', 'Si el email existe, recibirás un enlace de recuperación');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Forgot password error:', error);
    req.flash('error_msg', 'Error al procesar la solicitud');
    res.redirect('/auth/forgot-password');
  }
};

const showResetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const [tokenRecord] = await sequelize.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND used = false AND expires_at > datetime('now') 
       LIMIT 1`,
      { replacements: [token] }
    );

    if (!tokenRecord || tokenRecord.length === 0) {
      req.flash('error_msg', 'El enlace de recuperación ha expirado o es inválido');
      return res.redirect('/auth/forgot-password');
    }

    res.render('auth/reset-password', { 
      title: 'Nueva Contraseña - AdminJS',
      token,
      layout: null
    });
  } catch (error) {
    console.error('Show reset password error:', error);
    req.flash('error_msg', 'Error al procesar la solicitud');
    res.redirect('/auth/forgot-password');
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirm_password } = req.body;

    if (!password || !confirm_password) {
      req.flash('error_msg', 'Por favor completa todos los campos');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    if (password !== confirm_password) {
      req.flash('error_msg', 'Las contraseñas no coinciden');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    if (password.length < 6) {
      req.flash('error_msg', 'La contraseña debe tener al menos 6 caracteres');
      return res.redirect(`/auth/reset-password/${token}`);
    }

    const [tokenRecord] = await sequelize.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND used = false AND expires_at > datetime('now') 
       LIMIT 1`,
      { replacements: [token] }
    );

    if (!tokenRecord || tokenRecord.length === 0) {
      req.flash('error_msg', 'El enlace de recuperación ha expirado o es inválido');
      return res.redirect('/auth/forgot-password');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await sequelize.query(
      `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`,
      { replacements: [hashedPassword, tokenRecord[0].user_id] }
    );

    await sequelize.query(
      `UPDATE password_reset_tokens SET used = true, updated_at = datetime('now') WHERE id = ?`,
      { replacements: [tokenRecord[0].id] }
    );

    req.flash('success_msg', 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Reset password error:', error);
    req.flash('error_msg', 'Error al procesar la solicitud');
    res.redirect('/auth/forgot-password');
  }
};

export { 
  login, 
  logout, 
  showLogin, 
  showForgotPassword, 
  forgotPassword, 
  showResetPassword, 
  resetPassword 
};
