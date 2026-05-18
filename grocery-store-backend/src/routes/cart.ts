import { Router, Request, Response } from 'express';
import { db } from '../lib/db';

const router = Router();

// GET /api/cart/:userId
router.get('/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const result = await db.query(
    `SELECT ci.id, ci.quantity, ci.added_at,
            p.id as product_id, p.name, p.price, p.image_url,
            i.quantity as available_stock
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     JOIN inventory i ON p.id = i.product_id
     WHERE ci.user_id = $1`,
    [userId]
  );

  return res.json(result.rows);
});

// POST /api/cart — add item to cart
router.post('/', async (req: Request, res: Response) => {
  const { userId, productId, quantity } = req.body;

  // Check stock before adding to cart
  const stockCheck = await db.query(
    'SELECT quantity FROM inventory WHERE product_id = $1',
    [productId]
  );

  if (!stockCheck.rows[0] || stockCheck.rows[0].quantity < quantity) {
    return res.status(409).json({ error: 'Insufficient stock' });
  }

  // Upsert: if item already in cart, increment quantity
  const result = await db.query(
    `INSERT INTO cart_items (user_id, product_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET quantity = cart_items.quantity + $3
     RETURNING *`,
    [userId, productId, quantity]
  );

  return res.status(201).json(result.rows[0]);
});

// DELETE /api/cart/:itemId — remove item
router.delete('/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;

  await db.query('DELETE FROM cart_items WHERE id = $1', [itemId]);
  return res.status(204).send();
});

export default router;