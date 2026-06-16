# Local Grocery Store Website — Implementation Guide

A step-by-step guide for building a full-stack grocery store website with inventory tracking using React + TypeScript + Vite (frontend), Node.js + Express + TypeScript (backend), and AWS RDS PostgreSQL (database).

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Cost Breakdown](#2-cost-breakdown)
3. [Project Setup](#3-project-setup)
4. [Database Design](#4-database-design)
5. [Backend — Express API](#5-backend--express-api)
6. [Frontend — React + Vite](#6-frontend--react--vite)
7. [Stock Tracking System](#7-stock-tracking-system)
8. [Authentication (AWS Cognito)](#8-authentication-aws-cognito)
9. [Image Storage (AWS S3)](#9-image-storage-aws-s3)
10. [Deployment](#10-deployment)
11. [Alternative Database Options](#11-alternative-database-options)
12. [Admin Login Page](#12-admin-login-page)

---

## 1. Tech Stack Overview

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, CSS Modules |
| Backend | Node.js, Express, TypeScript |
| Database (Primary) | AWS RDS PostgreSQL (db.t4g.micro) |
| Cache | Redis (Railway service) |
| Auth | AWS Cognito |
| Image Storage | AWS S3 |
| Frontend Hosting | Cloudflare Pages (free) |
| Backend Hosting | Railway |

---

## 2. Cost Breakdown

### Monthly Cost at ~50 Users

| Service | Tier | Monthly Cost |
|---|---|---|
| Cloudflare Pages | Free | $0.00 |
| Railway (Express + Redis) | Hobby | ~$5–10 |
| AWS RDS PostgreSQL (db.t4g.micro) | On-Demand, Single-AZ | ~$14.00 |
| AWS S3 (product images) | Standard | ~$2.00 |
| AWS Cognito | Free tier (up to 50K MAU) | $0.00 |
| Domain Name | Any registrar | ~$1.50/mo (~$15/yr) |
| **Total** | | **~$22–28/month** |

### AWS RDS Cost Detail
- Instance (db.t4g.micro): ~$0.016/hr × 730 hrs = **~$11.68/month**
- Storage (20 GB gp3): $0.115/GB × 20 GB = **~$2.30/month**
- Backups: Free up to the size of your provisioned storage

> **AWS Free Tier Note:** If your AWS account was created before July 15, 2025, you receive 750 free hours/month of a db.t2/t3/t4g.micro Single-AZ instance for the first 12 months, making RDS free for your first year.

### Alternative Database Costs
See [Section 11](#11-alternative-database-options) for Railway PostgreSQL (~$0–5/mo) and Supabase (free tier available) as cheaper alternatives.

---

## 3. Project Setup

### 3.1 Prerequisites

- Node.js 20+ installed
- Git installed
- AWS account
- Railway account (railway.com)
- Cloudflare account (cloudflare.com)
- Docker Desktop (for local database development)

### 3.2 Repository Structure

Create two separate repositories (or a monorepo with two folders):

```
grocery-store-frontend/   ← Vite + React + TypeScript
grocery-store-backend/    ← Node.js + Express + TypeScript
```

### 3.3 Frontend Setup

```bash
npm create vite@latest grocery-store-frontend -- --template react-ts
cd grocery-store-frontend
npm install
```

CSS Modules are built into Vite — no additional packages needed. Configure `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',  // Forward API calls to Express in development
    },
  },
})
```

### 3.4 Backend Setup

```bash
mkdir grocery-store-backend && cd grocery-store-backend
npm init -y
npm install express cors dotenv pg redis
npm install -D typescript ts-node nodemon @types/express @types/cors @types/pg @types/node
npx tsc --init
```

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 3.5 Local Database Setup (Docker)

Run PostgreSQL and Redis locally during development — no AWS costs while building:

```powershell
# PostgreSQL
docker run -d `
  --name grocery-postgres `
  -e POSTGRES_PASSWORD=secret `
  -e POSTGRES_DB=grocerystore `
  -p 5432:5432 `
  postgres:16

# Redis
docker run -d `
  --name grocery-redis `
    -p 6379:6379 `
      redis:7
```

### 3.6 Environment Variables

Create a `.env` file in the backend root. Never commit this file to Git.

```env
# Local development
DATABASE_URL=postgresql://postgres:secret@localhost:5432/grocerystore
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
PORT=3000

# AWS (fill in after setting up AWS services)
AWS_REGION=us-west-2
AWS_S3_BUCKET=your-grocery-store-bucket
COGNITO_USER_POOL_ID=us-west-2_xxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. Database Design

### 4.1 Schema Overview

The database has five core tables:

- `categories` — product categories (Produce, Dairy, Bakery, etc.)
- `products` — product listings with price and description
- `inventory` — stock counts per product (the core of the tracking system)
- `users` — customer accounts (synced from Cognito)
- `cart_items` — items in a customer's active cart

### 4.2 SQL Schema

Run these statements to create the database schema. You can run them locally first, then against AWS RDS when ready to deploy.

```sql
-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory (stock tracking)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  last_updated TIMESTAMP DEFAULT NOW(),
  last_updated_by VARCHAR(255)  -- staff member who last updated stock
);

-- Users (synced from Cognito)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cognito_sub VARCHAR(255) UNIQUE NOT NULL,  -- Cognito's unique user identifier
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'customer',       -- 'customer' or 'admin'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cart items
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)               -- prevent duplicate cart entries
);

-- Indexes for common queries
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_cart_user ON cart_items(user_id);
```

### 4.3 Seed Data

```sql
-- Insert sample categories
INSERT INTO categories (name, slug) VALUES
  ('Produce', 'produce'),
  ('Dairy & Eggs', 'dairy-eggs'),
  ('Bakery', 'bakery'),
  ('Meat & Seafood', 'meat-seafood'),
  ('Pantry', 'pantry');

-- Insert a sample product
INSERT INTO products (category_id, name, description, price, sku)
VALUES (
  (SELECT id FROM categories WHERE slug = 'produce'),
  'Organic Fuji Apples',
  'Sweet and crisp organic apples, sold per pound.',
  1.99,
  'PRD-001'
);

-- Set initial inventory
INSERT INTO inventory (product_id, quantity, low_stock_threshold)
VALUES (
  (SELECT id FROM products WHERE sku = 'PRD-001'),
  50,
  10
);
```

---

## 5. Backend — Express API

### 5.1 Entry Point

```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/products';
import inventoryRouter from './routes/inventory';
import cartRouter from './routes/cart';
import categoriesRouter from './routes/categories';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/cart', cartRouter);
app.use('/api/categories', categoriesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 5.2 Database Connection

```typescript
// src/lib/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }  // Required for AWS RDS
    : false,
});
```

### 5.3 Redis Connection

```typescript
// src/lib/redis.ts
import { createClient } from 'redis';

export const redis = createClient({ url: process.env.REDIS_URL });

redis.on('error', (err) => console.error('Redis error:', err));
redis.connect();
```

### 5.4 Products Routes

```typescript
// src/routes/products.ts
import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { redis } from '../lib/redis';

const router = Router();

// GET /api/products — list all products with optional category filter
router.get('/', async (req: Request, res: Response) => {
  const { category, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const cacheKey = `products:${category || 'all'}:page${page}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const query = category
    ? `SELECT p.*, c.name as category_name, i.quantity,
         CASE
           WHEN i.quantity = 0 THEN 'out_of_stock'
           WHEN i.quantity <= i.low_stock_threshold THEN 'low_stock'
           ELSE 'in_stock'
         END as stock_status
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.is_active = true AND c.slug = $1
       ORDER BY p.name
       LIMIT $2 OFFSET $3`
    : `SELECT p.*, c.name as category_name, i.quantity,
         CASE
           WHEN i.quantity = 0 THEN 'out_of_stock'
           WHEN i.quantity <= i.low_stock_threshold THEN 'low_stock'
           ELSE 'in_stock'
         END as stock_status
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.is_active = true
       ORDER BY p.name
       LIMIT $1 OFFSET $2`;

  const params = category
    ? [category, limit, offset]
    : [limit, offset];

  const result = await db.query(query, params);

  await redis.setEx(cacheKey, 60, JSON.stringify(result.rows)); // 60 second cache
  return res.json(result.rows);
});

// GET /api/products/:id — single product detail
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
```

### 5.5 Inventory Routes

This is the most critical part of the stock tracking system. The `PATCH` route uses a database transaction to safely decrement stock and prevent overselling.

```typescript
// src/routes/inventory.ts
import { Router, Request, Response } from 'express';
import { db } from '../lib/db';
import { redis } from '../lib/redis';

const router = Router();

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
```

### 5.6 Cart Routes

```typescript
// src/routes/cart.ts
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
```

### 5.7 Categories Route

```typescript
// src/routes/categories.ts
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
```

---

## 6. Frontend — React + Vite

### 6.1 TypeScript Types

Define shared types used across components:

```typescript
// src/types/index.ts

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  sku: string;
  category_name: string;
  quantity: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  available_stock: number;
}

export interface InventoryStatus {
  quantity: number;
  low_stock_threshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}
```

### 6.2 API Utility

Centralise all API calls:

```typescript
// src/api/index.ts
const BASE_URL = '/api';

export const api = {
  // Products
  getProducts: async (category?: string, page = 1): Promise<Product[]> => {
    const params = new URLSearchParams({ page: String(page) });
    if (category) params.append('category', category);
    const res = await fetch(`${BASE_URL}/products?${params}`);
    return res.json();
  },

  getProduct: async (id: string): Promise<Product> => {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    return res.json();
  },

  // Inventory
  getInventoryStatus: async (productId: string): Promise<InventoryStatus> => {
    const res = await fetch(`${BASE_URL}/inventory/${productId}`);
    return res.json();
  },

  // Cart
  getCart: async (userId: string): Promise<CartItem[]> => {
    const res = await fetch(`${BASE_URL}/cart/${userId}`);
    return res.json();
  },

  addToCart: async (userId: string, productId: string, quantity: number) => {
    const res = await fetch(`${BASE_URL}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, productId, quantity }),
    });
    return res.json();
  },

  removeFromCart: async (itemId: string) => {
    await fetch(`${BASE_URL}/cart/${itemId}`, { method: 'DELETE' });
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${BASE_URL}/categories`);
    return res.json();
  },
};
```

### 6.3 Stock Badge Component

```css
/* src/components/StockBadge.module.css */
.badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  border-radius: 4px;
}
.inStock    { background-color: #16a34a; }
.lowStock   { background-color: #d97706; }
.outOfStock { background-color: #ef4444; }
```

```typescript
// src/components/StockBadge.tsx
import styles from './StockBadge.module.css';

interface StockBadgeProps {
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  quantity?: number;
}

export function StockBadge({ status, quantity }: StockBadgeProps) {
  if (status === 'out_of_stock') {
    return <span className={`${styles.badge} ${styles.outOfStock}`}>Out of Stock</span>;
  }

  if (status === 'low_stock') {
    return (
      <span className={`${styles.badge} ${styles.lowStock}`}>
        Low Stock {quantity !== undefined && `(${quantity} left)`}
      </span>
    );
  }

  return <span className={`${styles.badge} ${styles.inStock}`}>In Stock</span>;
}
```

### 6.4 Product Card Component

```css
/* src/components/ProductCard.module.css */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #f3f4f6;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); }
.image    { width: 100%; height: 192px; object-fit: cover; }
.body     { padding: 16px; }
.category { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.name     { font-weight: 600; color: #111827; margin-bottom: 4px; }
.price    { font-size: 1.125rem; font-weight: 700; color: #111827; margin-bottom: 12px; }
.footer   { display: flex; align-items: center; justify-content: space-between; }
.addButton {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: #16a34a;
  color: white;
}
.addButton:hover:not(:disabled) { background-color: #15803d; }
.addButton:disabled { background-color: #f3f4f6; color: #9ca3af; cursor: not-allowed; }
```

```typescript
// src/components/ProductCard.tsx
import { Product } from '../types';
import { StockBadge } from './StockBadge';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock_status === 'out_of_stock';

  return (
    <div className={styles.card}>
      <img
        src={product.image_url || '/placeholder.jpg'}
        alt={product.name}
        className={styles.image}
      />
      <div className={styles.body}>
        <p className={styles.category}>{product.category_name}</p>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>${product.price.toFixed(2)}</p>
        <div className={styles.footer}>
          <StockBadge status={product.stock_status} quantity={product.quantity} />
          <button
            onClick={() => onAddToCart(product.id)}
            disabled={isOutOfStock}
            className={styles.addButton}
          >
            {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6.5 Product List Page

```css
/* src/pages/ProductsPage.module.css */
.page    { max-width: 1280px; margin: 0 auto; padding: 32px 16px; }
.filters { display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; }
.filterBtn {
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
  background-color: #f3f4f6;
  color: #374151;
}
.filterBtn:hover  { background-color: #e5e7eb; }
.filterBtn.active { background-color: #16a34a; color: white; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}
.loading { text-align: center; padding: 48px 0; color: #6b7280; }
```

```typescript
// src/pages/ProductsPage.tsx
import { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { api } from '../api';
import { ProductCard } from '../components/ProductCard';
import styles from './ProductsPage.module.css';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getProducts(selectedCategory || undefined)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  // Re-check inventory when user switches back to the tab
  useEffect(() => {
    const handleFocus = () => {
      api.getProducts(selectedCategory || undefined).then(setProducts);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedCategory]);

  const handleAddToCart = async (productId: string) => {
    // Replace 'USER_ID' with actual user ID from auth context
    await api.addToCart('USER_ID', productId, 1);
  };

  return (
    <div className={styles.page}>
      <div className={styles.filters}>
        <button
          onClick={() => setSelectedCategory('')}
          className={`${styles.filterBtn}${selectedCategory === '' ? ` ${styles.active}` : ''}`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`${styles.filterBtn}${selectedCategory === cat.slug ? ` ${styles.active}` : ''}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading products...</div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 6.6 Wire Up App.tsx

The default Vite scaffold puts boilerplate content in `src/App.tsx`. Replace it entirely to render `ProductsPage` at the root route:

```typescript
// src/App.tsx
import { ProductsPage } from './components/ProductsPage';

function App() {
  return <ProductsPage />;
}

export default App;
```

You can also delete the generated `src/App.css` and remove the default assets (`reactLogo`, `viteLogo`, `heroImg`) once you no longer need them — they are only referenced by the Vite template.

> **Adding more pages later:** When you're ready to add routes (e.g. a product detail page or the admin inventory dashboard), install `react-router-dom` and wrap `App` with a `<BrowserRouter>`. At that point `App.tsx` becomes your route table rather than directly rendering a single page.

---

## 7. Stock Tracking System

### 7.1 How It Works End-to-End

The stock tracking system has three distinct moments where inventory is checked or updated:

**1. Page load** — When a customer visits a product page or the store homepage, the frontend calls `GET /api/products` which returns each product's `stock_status` and `quantity` derived from the `inventory` table. Redis caches this response for 60 seconds to reduce database load.

**2. Add to cart** — When a customer clicks "Add to Cart", the backend checks that sufficient stock exists before adding the item. If stock is insufficient, a 409 response is returned and the frontend shows an error.

**3. Checkout (final check)** — At the moment of purchase, `PATCH /api/inventory/:productId` runs a PostgreSQL transaction that atomically decrements stock. The `WHERE quantity + $1 >= 0` condition ensures the database rejects the update if stock would go negative, protecting against race conditions when two customers buy the last item simultaneously.

### 7.2 Admin Dashboard — Manual Stock Updates

Store staff need a way to update stock when new deliveries arrive. Build a simple admin page that calls `PUT /api/inventory/:productId` with an absolute quantity:

```css
/* src/pages/AdminInventoryPage.module.css */
.page    { max-width: 896px; margin: 0 auto; padding: 32px 16px; }
.heading { font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; }
.table   { width: 100%; border-collapse: collapse; }
.table thead tr { background-color: #f9fafb; }
.table th { text-align: left; padding: 12px; border: 1px solid #e5e7eb; }
.table td { padding: 12px; border: 1px solid #e5e7eb; }
.table tbody tr:hover { background-color: #f9fafb; }
.sku          { color: #6b7280; font-size: 0.875rem; }
.inStock      { color: #16a34a; font-size: 0.875rem; font-weight: 500; }
.lowStock     { color: #d97706; font-size: 0.875rem; font-weight: 500; }
.outOfStock   { color: #dc2626; font-size: 0.875rem; font-weight: 500; }
.updateCell   { display: flex; gap: 8px; align-items: center; }
.qtyInput     { width: 80px; border: 1px solid #d1d5db; border-radius: 4px; padding: 4px 8px; font-size: 0.875rem; }
.saveBtn      { padding: 4px 12px; background-color: #2563eb; color: white; font-size: 0.875rem; border-radius: 4px; border: none; cursor: pointer; }
.saveBtn:hover { background-color: #1d4ed8; }
```

```typescript
// src/pages/AdminInventoryPage.tsx
import { useState, useEffect } from 'react';
import { Product } from '../types';
import { api } from '../api';
import styles from './AdminInventoryPage.module.css';

export function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    api.getProducts().then(setProducts);
  }, []);

  const handleUpdateStock = async (productId: string, newQuantity: number) => {
    await fetch(`/api/inventory/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity, updatedBy: 'admin' }),
    });
    // Refresh product list
    api.getProducts().then(setProducts);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Inventory Management</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Current Stock</th>
            <th>Status</th>
            <th>Update Stock</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <InventoryRow
              key={product.id}
              product={product}
              onUpdate={handleUpdateStock}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryRow({
  product,
  onUpdate,
}: {
  product: Product;
  onUpdate: (id: string, qty: number) => void;
}) {
  const [newQty, setNewQty] = useState(product.quantity);

  const statusClass =
    product.stock_status === 'out_of_stock' ? styles.outOfStock :
    product.stock_status === 'low_stock'    ? styles.lowStock :
    styles.inStock;

  return (
    <tr>
      <td>{product.name}</td>
      <td className={styles.sku}>{product.sku}</td>
      <td>{product.quantity}</td>
      <td>
        <span className={statusClass}>
          {product.stock_status.replace('_', ' ')}
        </span>
      </td>
      <td>
        <div className={styles.updateCell}>
          <input
            type="number"
            min="0"
            value={newQty}
            onChange={(e) => setNewQty(parseInt(e.target.value))}
            className={styles.qtyInput}
          />
          <button onClick={() => onUpdate(product.id, newQty)} className={styles.saveBtn}>
            Save
          </button>
        </div>
      </td>
    </tr>
  );
}
```

### 7.3 Stock Status Logic Summary

| Condition | Status Shown |
|---|---|
| `quantity = 0` | 🔴 Out of Stock |
| `quantity <= low_stock_threshold` | 🟡 Low Stock (X left) |
| `quantity > low_stock_threshold` | 🟢 In Stock |

The `low_stock_threshold` defaults to 10 but can be set per product in the `inventory` table.

---

## 8. Authentication (AWS Cognito)

### 8.1 Set Up Cognito User Pool

1. Go to **AWS Console → Cognito → Create User Pool**
2. Sign-in options: select **Email**
3. Password policy: use defaults or customize
4. Create an **App Client** (no client secret for web apps)
5. Copy your **User Pool ID** and **Client ID** into your `.env` file

Create two Cognito groups: `customers` and `admins`. Staff accounts go in the `admins` group.

### 8.2 Install Cognito Libraries

```bash
# Frontend
npm install aws-amplify @aws-amplify/ui-react

# Backend (for JWT verification)
npm install aws-jwt-verify
```

### 8.3 Frontend Auth Setup

```typescript
// src/main.tsx
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: { email: true },
    },
  },
});
```

### 8.4 Backend JWT Verification Middleware

Protect admin routes by verifying the Cognito JWT on every request:

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  tokenUse: 'access',
});

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = await verifier.verify(token);
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await requireAuth(req, res, async () => {
    const groups = (req as any).user['cognito:groups'] || [];
    if (!groups.includes('admins')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
```

Apply middleware to protected routes in `index.ts`:

```typescript
import { requireAdmin } from './middleware/auth';

// Only admins can update inventory
app.use('/api/inventory', requireAdmin, inventoryRouter);
```

---

## 9. Image Storage (AWS S3)

### 9.1 Create an S3 Bucket

1. Go to **AWS Console → S3 → Create Bucket**
2. Name it something like `your-store-name-products`
3. Region: match your RDS region
4. Block public access: **off** (product images need to be publicly viewable)
5. Enable static website hosting or use CloudFront for faster delivery

### 9.2 Upload Images from the Backend

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer @types/multer
```

```typescript
// src/routes/upload.ts
import { Router } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({ region: process.env.AWS_REGION });

router.post('/image', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const key = `products/${Date.now()}-${req.file.originalname}`;

  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  }));

  const imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return res.json({ imageUrl });
});

export default router;
```

---

## 10. Deployment

### 10.1 Deploy Backend to Railway

1. Create a Railway account at [railway.com](https://railway.com)
2. Click **New Project → Deploy from GitHub repo** and select your backend repository
3. Railway auto-detects Node.js and runs `npm run build && npm start`
4. Add a **PostgreSQL** service: click **+ New → Database → PostgreSQL**
5. Add a **Redis** service: click **+ New → Database → Redis**
6. Go to your backend service **Variables** and add all values from your `.env` file
   - For `DATABASE_URL`, Railway provides this automatically when you add Postgres
   - For `REDIS_URL`, Railway provides this automatically when you add Redis
7. Your backend gets a public URL like `https://your-app.up.railway.app`

### 10.2 Set Up AWS RDS PostgreSQL

> **Note:** Skip this initially and use Railway's built-in PostgreSQL for development. Switch to RDS when the store is ready to go live.

1. Go to **AWS Console → RDS → Create Database**
2. Engine: **PostgreSQL**
3. Template: **Free Tier** (if eligible) or **Dev/Test**
4. Instance: `db.t4g.micro`
5. Storage: 20 GB gp3
6. Public access: **Yes** (so Railway can connect to it)
7. Create a VPC Security Group that allows inbound traffic on port 5432 from Railway's IP ranges (or 0.0.0.0/0 for simplicity on a small store)
8. Once created, copy the **endpoint URL** and update `DATABASE_URL` in Railway's environment variables:

```
DATABASE_URL=postgresql://username:password@your-rds-endpoint.rds.amazonaws.com:5432/grocerystore
```

9. Run your schema SQL against the RDS instance:

```bash
psql $DATABASE_URL -f schema.sql
```

### 10.3 Deploy Frontend to Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com)
2. Click **Create a project → Connect to Git**
3. Select your frontend repository
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Add environment variables:
   - `VITE_COGNITO_USER_POOL_ID`
   - `VITE_COGNITO_CLIENT_ID`
   - `VITE_API_URL` — your Railway backend URL
6. Update your `api/index.ts` to use the environment variable in production:

```typescript
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
```

7. Update CORS on your backend to allow your Cloudflare Pages domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-store.pages.dev',
    'https://yourgrocerystore.com', // custom domain
  ],
  credentials: true,
}));
```

### 10.4 Custom Domain

1. Purchase a domain from Namecheap, Google Domains, or AWS Route 53 (~$15/year)
2. In Cloudflare Pages, go to **Custom Domains → Set up a custom domain**
3. Point your domain's nameservers to Cloudflare for automatic SSL

---

## 11. Alternative Database Options

If AWS RDS is too expensive or complex for your needs, here are two cheaper alternatives that require minimal configuration changes.

### Option A: Railway PostgreSQL
**Cost: ~$0–5/month** (covered by existing Railway Hobby plan credit)

Railway provides managed PostgreSQL as a one-click add-on in the same project as your Express server. No VPC setup, no security groups, no SSL configuration. The `DATABASE_URL` is automatically injected as an environment variable.

**To switch from RDS to Railway Postgres:**
1. In your Railway project, click **+ New → Database → PostgreSQL**
2. Railway automatically sets `DATABASE_URL` in your backend environment
3. Run your schema SQL via Railway's database shell
4. Remove `ssl: { rejectUnauthorized: false }` from `db.ts` (Railway handles SSL automatically)

**Tradeoff:** Less fine-grained control over backups and instance configuration compared to RDS. Suitable for small stores up to a few hundred users.

### Option B: Supabase Free Tier
**Cost: $0** (500 MB storage, 5 GB bandwidth, 50K MAU)

Supabase is a Firebase alternative built on PostgreSQL. Their free tier has no time limit and is sufficient for a small grocery store.

**To switch from RDS to Supabase:**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string** and copy the URI
3. Paste it as `DATABASE_URL` in your Railway environment variables
4. Run your schema SQL in the Supabase **SQL Editor**
5. No changes needed to your Express code — it's still standard PostgreSQL

**Tradeoff:** Free projects pause after 1 week of inactivity. This is unlikely to be a problem for an active store, but worth noting. Upgrade to Supabase Pro ($25/month) if you need guaranteed uptime SLAs.

### Database Cost Comparison

| Option | Monthly Cost | Setup Complexity | Best For |
|---|---|---|---|
| AWS RDS (db.t4g.micro) | ~$14 | High | Production, scaling |
| Railway PostgreSQL | ~$0–5 | Very Low | Development, small stores |
| Supabase Free | $0 | Low | Getting started, tight budget |
| Supabase Pro | $25 | Low | Production with simple billing |

---

*Last updated: May 2026*

---

## 12. Admin Login Page

### Overview

When a user navigates to `/admin`, they are shown a login form instead of the inventory page if they are not authenticated. After successfully signing in with Cognito credentials, the access token is stored in React context and attached to all inventory API requests. The backend's existing `requireAdmin` middleware validates the token and checks group membership, so no backend changes are needed.

### Auth Flow

```
User visits /admin
       ↓
RequireAdmin checks AuthContext for token
       ↓
  No token?              Token present?
      ↓                       ↓
AdminLoginPage        AdminInventoryPage
(email/password)      (inventory table)
      ↓
Amplify signIn(email, password)
      ↓
Store accessToken in AuthContext (+ localStorage)
      ↓
Redirect → /admin (AdminInventoryPage)
All /api/inventory calls include Authorization: Bearer <token>
```

### Files to Create

| File | Purpose |
|---|---|
| `src/context/AuthContext.tsx` | React context holding the access token and login/logout functions |
| `src/pages/AdminLoginPage.tsx` | Email + password form that calls Amplify `signIn` |
| `src/pages/AdminLoginPage.module.css` | Styling for the login form |

### Files to Modify

| File | Change |
|---|---|
| `src/App.tsx` | Wrap the app in `AuthProvider`; protect `/admin` with `RequireAdmin` |
| `src/api/index.ts` | Pass `Authorization: Bearer <token>` header on all inventory calls |

---

### Step 1 — Create `AuthContext.tsx`

```tsx
// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signOut as amplifySignOut } from 'aws-amplify/auth';

interface AuthContextType {
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('adminToken')
  );

  const login = async (email: string, password: string) => {
    const { isSignedIn, nextStep } = await signIn({ username: email, password });
    if (!isSignedIn) throw new Error(`Auth step required: ${nextStep.signInStep}`);

    // Retrieve the access token from the active session
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (!token) throw new Error('No access token returned');

    localStorage.setItem('adminToken', token);
    setAccessToken(token);
  };

  const logout = () => {
    amplifySignOut();
    localStorage.removeItem('adminToken');
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

---

### Step 2 — Create `AdminLoginPage.tsx`

```tsx
// src/pages/AdminLoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLoginPage.module.css';

export function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <h2>Admin Login</h2>
        {error && <p className={styles.error}>{error}</p>}
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
```

Basic CSS (`AdminLoginPage.module.css`):

```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 320px;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form h2 {
  margin: 0 0 0.5rem;
}

.form input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.form button {
  padding: 0.6rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}
```

---

### Step 3 — Create `RequireAdmin` and update `App.tsx`

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductsPage } from './components/ProductsPage';
import { AdminInventoryPage } from './pages/AdminInventoryPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { CartPage } from './pages/CartPage';

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { accessToken } = useAuth();
  return accessToken ? children : <AdminLoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminInventoryPage />
              </RequireAdmin>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

`RequireAdmin` renders `AdminLoginPage` in place (same URL) if no token exists, avoiding a separate `/admin/login` route. After a successful login, it re-renders with the token present and shows `AdminInventoryPage`.

---

### Step 4 — Pass the token in API calls

Update the inventory fetch in `src/api/index.ts` to include the `Authorization` header:

```ts
// Before
export const getInventory = async () => {
  const res = await fetch('/api/inventory');
  return res.json();
};

// After
export const getInventory = async (token: string) => {
  const res = await fetch('/api/inventory', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};
```

Add a **Sign Out** button in the admin page header that calls `logout()` from `useAuth()`.

---

### Token Expiry

  Cognito access tokens expire after 1 hour by default. If a token stored in `localStorage` is expired, the backend will return `401`. Handle this in the API client:

  ```ts
  if (res.status === 401) {
    logout();        // clear token, forces re-render of AdminLoginPage
    return;
  }
```
