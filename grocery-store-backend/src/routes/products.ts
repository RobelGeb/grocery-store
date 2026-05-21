import { Router , Request, Response } from 'express';
import { db } from '../lib/db';
import { redis } from '../lib/redis';

const router = Router();

// GET /api/products - list all products with optional category filter
router.get('/', async (req: Request, res: Response) => {
    const { category, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const cacheKey = `products:${category || 'all'}:page${page}`;
    const cached = await redis.get(cacheKey); 

    if (cached) return res.json(JSON.parse(cached));

    // stocking system logic -- FINISH THIS
    const query = category
    ? `SELECT  p.*, c.name as category_name, i.quantity,
        CASE
            WHEN i.quantity = 0 THEN 'out of stock'
            WHEN i.quantity <= i.low_stock_threshold THEN 'low stock'
            ELSE 'in stock'
        END as stock_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.is_active = true AND c.slug = $1
        ORDER BY p.name
        LIMIT $2 OFFSET $3`
        : `SELECT p.*, c.name as category_name, i.quantity,
            CASE
                WHEN i.quantity = 0 THEN 'out of stock'
                WHEN i.quantity <= i.low_stock_threshold THEN 'low_stock'
                ELSE 'in_stock'
            END as stock_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.is_active = true
        ORDER BY p.name
        LIMIT $1 OFFSET $2`;

    const params = category ? [category, limit, offset] : [limit, offset];

    const result = await db.query(query, params);

    await redis.setEx(cacheKey, 60, JSON.stringify(result.rows)); // 60 sec cache expiration
    return res.json(result.rows);
});

// GET /api/products/:id - single product detail
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const cacheKey = `product:${id}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const result = await db.query(
        `SELECT p.*, c.name as category_name, i.quantity, i.low_stock_threshold,
            CASE
                WHEN i.quantity = 0 THEN 'out_of_stock'
                WHEN i.quantity <= i.low_stock_threshold THEN 'low_stock'
                ELSE 'in_stock'
            END as stock_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.id = $1 AND p.is_active = true`,
        [id]
    );

    if (!result.rows[0]) {
        return res.status(404).json({ error: 'Product not found' });
    }

    await redis.setEx(cacheKey, 300, JSON.stringify(result.rows[0])); // 5 min cache
    return res.json(result.rows[0]);
});

// POST /api/products — create product (admin only)
router.post('/', async (req: Request, res: Response) => {
  const { name, description, price, sku, category_id, image_url } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const product = await client.query(
      `INSERT INTO products (name, description, price, sku, category_id, image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, sku, category_id, image_url]
    );

    // Create inventory record for new product
    await client.query(
      `INSERT INTO inventory (product_id, quantity) VALUES ($1, 0)`,
      [product.rows[0].id]
    );

    await client.query('COMMIT');
    return res.status(201).json(product.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
});

export default router;