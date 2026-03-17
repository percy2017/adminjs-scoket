import { User, Role, Permission } from '../database/models/index.js';

const isAjax = (req) => {
  const contentType = req.headers['content-type'] || '';
  const accept = req.headers.accept || '';
  return req.xhr || 
         accept.includes('application/json') ||
         contentType.includes('application/json');
};

export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  if (isAjax(req)) {
    return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });
  }
  
  req.flash('error_msg', 'Debes iniciar sesión para acceder');
  res.redirect('/auth/login');
};

export const isAdmin = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    if (isAjax(req)) {
      return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });
    }
    req.flash('error_msg', 'Debes iniciar sesión para acceder');
    return res.redirect('/auth/login');
  }

  const user = await User.findByPk(req.session.user.id, {
    include: [{ model: Role, as: 'roleData', include: [{ model: Permission, as: 'permissions' }] }]
  });

  if (!user || !user.roleData) {
    if (req.session.user.role === 'admin') {
      return next();
    }
    req.flash('error_msg', 'No tienes permiso para acceder a esta sección');
    return res.redirect('/admin');
  }

  const hasAdminRole = user.roleData.name === 'admin';
  const hasBrowseAdmin = user.roleData.permissions.some(p => p.key === 'browse_admin');

  if (hasAdminRole || hasBrowseAdmin) {
    return next();
  }

  req.flash('error_msg', 'No tienes permiso para acceder a esta sección');
  res.redirect('/admin');
};

export const isEditor = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    req.flash('error_msg', 'Debes iniciar sesión para acceder');
    return res.redirect('/auth/login');
  }

  const user = await User.findByPk(req.session.user.id, {
    include: [{ model: Role, as: 'roleData' }]
  });

  if (!user || !user.roleData) {
    if (req.session.user.role === 'admin' || req.session.user.role === 'editor') {
      return next();
    }
    req.flash('error_msg', 'No tienes permiso para acceder a esta sección');
    return res.redirect('/admin');
  }

  const hasEditorRole = ['admin', 'editor'].includes(user.roleData.name);

  if (hasEditorRole) {
    return next();
  }

  req.flash('error_msg', 'No tienes permiso para acceder a esta sección');
  res.redirect('/admin');
};

export const hasRole = (roleName) => {
  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error_msg', 'Debes iniciar sesión para acceder');
      return res.redirect('/auth/login');
    }

    const user = await User.findByPk(req.session.user.id, {
      include: [{ model: Role, as: 'roleData' }]
    });

    if (!user || !user.roleData) {
      if (req.session.user.role === roleName) {
        return next();
      }
      req.flash('error_msg', 'No tienes el rol requerido');
      return res.redirect('/admin');
    }

    if (user.roleData.name === roleName || user.roleData.name === 'admin') {
      return next();
    }

    req.flash('error_msg', 'No tienes el rol requerido');
    res.redirect('/admin');
  };
};

export const can = (permissionKey) => {
  return async (req, res, next) => {
    const ajax = isAjax(req);
    if (!req.session || !req.session.user) {
      if (isAjax(req)) {
        return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });
      }
      req.flash('error_msg', 'Debes iniciar sesión para acceder');
      return res.redirect('/auth/login');
    }

    const user = await User.findByPk(req.session.user.id, {
      include: [{ model: Role, as: 'roleData', include: [{ model: Permission, as: 'permissions' }] }]
    });

    if (!user) {
      if (isAjax(req)) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      req.flash('error_msg', 'Usuario no encontrado');
      return res.redirect('/admin');
    }

    if (!user.roleData) {
      if (req.session.user.role === 'admin') {
        return next();
      }
      if (isAjax(req)) {
        return res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción' });
      }
      req.flash('error_msg', 'No tienes permiso para realizar esta acción');
      return res.redirect('/admin');
    }

    const hasPermission = user.roleData.permissions.some(p => p.key === permissionKey);
    const isAdmin = user.roleData.name === 'admin';

    if (hasPermission || isAdmin) {
      return next();
    }

    if (isAjax(req)) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para realizar esta acción' });
    }
    req.flash('error_msg', 'No tienes permiso para realizar esta acción');
    res.redirect('/admin');
  };
};

export const canAction = (action, resource) => {
  const permissionKey = `${action}_${resource}`;
  return can(permissionKey);
};
