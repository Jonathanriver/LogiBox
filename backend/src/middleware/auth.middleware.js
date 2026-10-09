import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) {
    return res.status(401).json({ success: false, message: 'Inicia sesión para continuar.' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = { id: Number(payload.sub), role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'La sesión expiró. Inicia sesión nuevamente.' });
  }
};

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) {
    return res.status(403).json({ success: false, message: 'No tienes permisos para esta acción.' });
  }
  return next();
};