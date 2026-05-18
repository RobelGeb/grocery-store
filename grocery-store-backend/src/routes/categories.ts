import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { redis } from '../lib/redis';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const cached = await redis.get('categories');
  if (cached) return res.json(JSON.parse(cached));

  const result = await db.query(
    'SELECT * FROM categories ORDER BY name'
  );

  await redis.setEx('categories', 3600, JSON.stringify(result.rows)); // 1 hr cache
  return res.json(result.rows);
});

export default router;