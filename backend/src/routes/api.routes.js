import { Router } from 'express';
import {
  getItems,
  getItemById,
  createItem,
  toggleItem,
  deleteItem
} from '../controllers/items.controller.js';

const router = Router();

router.get('/items', getItems);
router.get('/items/:id', getItemById);
router.post('/items', createItem);
router.patch('/items/:id/toggle', toggleItem);
router.delete('/items/:id', deleteItem);

export default router;
