import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../config/database.js';
import { config } from '../config/index.js';

const accessRequests = [];

/**
 * POST /api/auth/login
 * Iniciar sesión con email y contraseña
 */
export const login = async (req, res, next) => {
  const { email, password, rememberMe } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingresa tanto el correo electrónico como la contraseña.'
    });
  }

  try {
    const [users] = await database.execute(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.role_label, u.avatar, u.phone,
              COALESCE(CONCAT(v.model, ' - Placa ', v.plate), u.vehicle) AS vehicle
       FROM users u LEFT JOIN vehicles v ON v.driver_id = u.id
       WHERE u.email = ? LIMIT 1`,
      [email.trim().toLowerCase()]
    );
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Verifica tu correo y contraseña.'
      });
    }

    const token = jwt.sign(
      { role: user.role },
      config.jwtSecret,
      { subject: String(user.id), expiresIn: rememberMe ? '14d' : '12h' }
    );
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleLabel: user.role_label,
      avatar: user.avatar,
      phone: user.phone,
      vehicle: user.vehicle,
      rememberMe: !!rememberMe
    };

    return res.status(200).json({
      success: true,
      message: `¡Bienvenido de nuevo, ${user.name}!`,
      token,
      user: userPayload
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/auth/request-access
 * Registrar solicitud de acceso para nuevos conductores o coordinadores
 */
export const requestAccess = (req, res) => {
  const { fullName, email, role, phone, comments } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({
      success: false,
      message: 'Nombre completo y correo electrónico son obligatorios.'
    });
  }

  const newRequest = {
    id: accessRequests.length + 1,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    role: role || 'conductor',
    phone: phone ? phone.trim() : '',
    comments: comments ? comments.trim() : '',
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  accessRequests.push(newRequest);

  return res.status(201).json({
    success: true,
    message: 'Solicitud de acceso enviada exitosamente. Un coordinador revisará tu perfil en breve.',
    request: newRequest
  });
};

/**
 * POST /api/auth/forgot-password
 * Recuperación de contraseña
 */
export const forgotPassword = (req, res) => {
  const { email } = req.body;

  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingresa tu correo electrónico.'
    });
  }

  return res.status(200).json({
    success: true,
    message: `Si la cuenta asociada a ${email.trim()} existe, recibirás instrucciones para restablecer tu contraseña.`
  });
};

/**
 * GET /api/auth/demo-users
 * Obtiene usuarios demo disponibles para facilitar pruebas
 */
export const getDemoUsers = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(200).json({ success: true, data: [] });
  }

  try {
    const [demoList] = await database.execute(
      `SELECT email, role, role_label AS roleLabel, name FROM users
       WHERE email IN (?, ?) ORDER BY id`,
      ['conductor@logibox.com', 'coordinador@logibox.com']
    );
    return res.status(200).json({ success: true, data: demoList });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'No se pudieron consultar los usuarios demo.' });
  }
};

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
export const logout = (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente.'
  });
};

