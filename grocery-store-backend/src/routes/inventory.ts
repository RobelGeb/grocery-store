import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { redis } from '../lib/redis';

const router = Router();


// GET /api/inventory - get all inventory records (admin)
router.get('/', async (req: Request, res: Response) => {
  const result = await db.query(
    `SELECT quantity, low_stock_threshold FROM inventory`
  )
  
  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }

  return res.json(result.rows);
})


// GET /api/inventory/:productId — get current stock status
router.get('/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;

  const result = await db.query(
    `SELECT quantity, low_stock_threshold,
       CASE
         WHEN quantity = 0 THEN 'out_of_stock'
         WHEN quantity <= low_stock_threshold THEN 'low_stock'
         ELSE 'in_stock'
       END as status
     FROM inventory WHERE product_id = $1`,
    [productId]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ error: 'Inventory record not found' });
  }

  return res.json(result.rows[0]);
});

// PATCH /api/inventory/:productId — update stock (purchase or restock)
// adjustment: negative number for purchase, positive for restock
router.patch('/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { adjustment, updatedBy } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // The WHERE clause `quantity + $1 >= 0` prevents stock going below zero.
    // If this condition fails, rowCount will be 0 and we rollback.
    const result = await client.query(
      `UPDATE inventory
       SET quantity = quantity + $1,
           last_updated = NOW(),
           last_updated_by = $2
       WHERE product_id = $3 AND quantity + $1 >= 0
       RETURNING quantity`,
      [adjustment, updatedBy || 'system', productId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Insufficient stock' });
    }

    await client.query('COMMIT');

    // Invalidate cached product data so next read reflects new stock
    await redis.del(`product:${productId}`);
    await redis.del('products:all:page1'); // Invalidate product list cache

    return res.json({ newQuantity: result.rows[0].quantity });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/inventory/:productId — set absolute stock count (admin: manual audit)
router.put('/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { quantity, updatedBy } = req.body;

  if (quantity < 0) {
    return res.status(400).json({ error: 'Quantity cannot be negative' });
  }

  const result = await db.query(
    `UPDATE inventory
     SET quantity = $1, last_updated = NOW(), last_updated_by = $2
     WHERE product_id = $3
     RETURNING *`,
    [quantity, updatedBy || 'admin', productId]
  );

  await redis.del(`product:${productId}`);

  return res.json(result.rows[0]);
});

export default router;