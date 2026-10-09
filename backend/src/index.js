import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from './config/index.js';
import { initializeDatabase } from './config/database.js';
import healthRoutes from './routes/health.routes.js';
import apiRoutes from './routes/api.routes.js';
import authRoutes from './routes/auth.routes.js';
import zoneRoutes from './routes/zones.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false // Permite flexibilidad con assets y Angular SPA
}));

// Configuración CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como apps móviles, Postman o curl)
    if (!origin) return callback(null, true);
    if (config.allowedOrigins.indexOf(origin) !== -1 || config.nodeEnv === 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Permisivo por defecto en desarrollo local
    }
  },
  credentials: true
}));

// Logger HTTP
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Parseo de cuerpo JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de API
app.use('/api/health', healthRoutes);
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);

// Servir frontend compilado de Angular (Ideal para hosting unificado)
const angularDistPaths = [
  path.join(__dirname, '../../frontend/dist/frontend/browser'),
  path.join(__dirname, '../../frontend/dist/frontend'),
  path.join(__dirname, '../public')
];

const distPath = angularDistPaths.find(p => fs.existsSync(p));

if (distPath) {
  console.log(`[Hosting] Sirviendo frontend estático desde: ${distPath}`);
  app.use(express.static(distPath));

  // Manejo de rutas de Angular SPA (cualquier ruta no-API devuelve index.html)
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Mensaje informativo si el frontend aún no se ha compilado
  app.get('/', (req, res) => {
    res.json({
      message: 'API Node.js + Express funcionando correctamente.',
      frontendStatus: 'Frontend no compilado. Ejecuta "npm run build" o ejecuta Angular en modo desarrollo (ng serve).',
      endpoints: {
        health: '/api/health',
        items: '/api/items'
      }
    });
  });
}

// Manejador de rutas no encontradas (404) para API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint de API no encontrado'
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('[Error no controlado]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
});

const startServer = async () => {
  if (config.nodeEnv === 'production' && (!config.jwtSecret || config.jwtSecretIsPlaceholder)) {
    throw new Error('Configura un JWT_SECRET propio y aleatorio en producción.');
  }
  await initializeDatabase();
  const server = app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(`🚀 Servidor ejecutándose en el puerto: ${config.port}`);
    console.log(`🌐 Modo: ${config.nodeEnv}`);
    console.log(`📡 URL API: http://localhost:${config.port}/api`);
    console.log(`❤️  Salud: http://localhost:${config.port}/api/health`);
    console.log(`===============================================`);
  });

  const handleShutdown = (signal) => {
    console.log(`[${signal}] Recibida señal de terminación. Cerrando servidor HTTP...`);
    server.close(() => {
      console.log('[Servidor cerrado] Todas las conexiones han terminado.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[Error] Forzando apagado por timeout de conexiones activas.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

startServer().catch((error) => {
  const details = [error.code, error.message].filter(Boolean).join(': ') || error;
  console.error('[Base de datos] No fue posible inicializar MySQL:', details);
  process.exit(1);
});

export default app;
