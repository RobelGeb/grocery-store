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
            WHEN i.quantity = 0 THEN 'out of stock'`
})