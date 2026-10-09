import { Router } from 'express';
import {
  createZone,
  createZoneOrder,
  deleteZone,
  getDrivers,
  getMyZones,
  getZones,
  updateZone,
  updateMyOrderStatus
} from '../controllers/zones.controller.js';
import {
  downloadBulkTemplate,
  previewBulkOrders,
  importBulkOrders,
  upload
} from '../controllers/bulk-orders.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();
const managersOnly = [authenticate, authorizeRoles('coordinador', 'admin')];

router.get('/my', authenticate, authorizeRoles('conductor'), getMyZones);
router.patch('/orders/:orderId/status', authenticate, authorizeRoles('conductor'), updateMyOrderStatus);
router.get('/drivers', ...managersOnly, getDrivers);
router.get('/', ...managersOnly, getZones);
router.post('/', ...managersOnly, createZone);
router.patch('/:zoneId', ...managersOnly, updateZone);
router.delete('/:zoneId', ...managersOnly, deleteZone);
router.post('/:zoneId/orders', ...managersOnly, createZoneOrder);

// Rutas de carga masiva de pedidos organizados por zonas
router.get('/bulk-template', authenticate, downloadBulkTemplate);
router.post('/orders/bulk-preview', ...managersOnly, upload.single('file'), previewBulkOrders);
router.post('/orders/bulk-import', ...managersOnly, upload.single('file'), importBulkOrders);

export default router;