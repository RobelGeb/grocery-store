# Database Schema Diagram

## Entity-Relationship Diagram

```
┌─────────────────────────────────────┐
│              categories             │
├──────────────┬──────────────────────┤
│ PK  id       │ UUID                 │
│     name     │ VARCHAR(100) NOT NULL│
│ UQ  slug     │ VARCHAR(100) NOT NULL│
│     created_at│ TIMESTAMP           │
└──────────────┴──────────────────────┘
        │
        │ category_id (FK, ON DELETE SET NULL)
        │ 0..* products per category
        ▼
┌──────────────────────────────────────────┐
│                 products                 │
├──────────────┬───────────────────────────┤
│ PK  id       │ UUID                      │
│ FK  category_id│ UUID → categories(id)   │
│     name     │ VARCHAR(255) NOT NULL     │
│     description│ TEXT                    │
│     price    │ DECIMAL(10,2) NOT NULL    │
│     image_url│ TEXT                      │
│ UQ  sku      │ VARCHAR(100) NOT NULL     │
│     is_active│ BOOLEAN DEFAULT true      │
│     created_at│ TIMESTAMP                │
│     updated_at│ TIMESTAMP                │
└──────────────┴───────────────────────────┘
        │                        │
        │ product_id             │ product_id
        │ (FK, ON DELETE CASCADE)│ (FK, ON DELETE CASCADE)
        ▼                        ▼
┌───────────────────────────┐  ┌────────────────────────────────┐
│         inventory         │  │           cart_items           │
├──────────────┬────────────┤  ├──────────────┬─────────────────┤
│ PK  id       │ UUID       │  │ PK  id       │ UUID            │
│ FK,UQ product_id│ UUID    │  │ FK  user_id  │ UUID → users(id)│
│     quantity │ INTEGER ≥0 │  │ FK  product_id│ UUID           │
│     low_stock_│ INTEGER   │  │     quantity │ INTEGER > 0     │
│     threshold│ DEFAULT 10 │  │     added_at │ TIMESTAMP       │
│     last_updated│ TIMESTAMP│  │ UQ  (user_id,│                │
│     last_updated_by│ VARCHAR│  │      product_id)             │
└───────────────────────────┘  └────────────────────────────────┘
                                        ▲
                                        │ user_id (FK, ON DELETE CASCADE)
                                        │
                               ┌─────────────────────────────────┐
                               │              users               │
                               ├──────────────┬──────────────────┤
                               │ PK  id       │ UUID             │
                               │ UQ  cognito_sub│ VARCHAR(255)   │
                               │ UQ  email    │ VARCHAR(255)     │
                               │     role     │ VARCHAR(50)      │
                               │              │ DEFAULT 'customer'│
                               │     created_at│ TIMESTAMP       │
                               └──────────────┴──────────────────┘
```

## Relationship Summary

| Relationship | Type | Behavior on Delete |
|---|---|---|
| `categories` → `products` | One-to-Many | `SET NULL` on `products.category_id` |
| `products` → `inventory` | One-to-One | `CASCADE` delete inventory row |
| `products` → `cart_items` | One-to-Many | `CASCADE` delete cart entries |
| `users` → `cart_items` | One-to-Many | `CASCADE` delete cart entries |

## Indexes

| Index Name | Table | Column(s) | Purpose |
|---|---|---|---|
| `idx_products_category` | `products` | `category_id` | Fast category-based product listing |
| `idx_products_sku` | `products` | `sku` | Fast SKU lookups |
| `idx_inventory_product` | `inventory` | `product_id` | Fast stock checks by product |
| `idx_cart_user` | `cart_items` | `user_id` | Fast cart retrieval per user |

---

## Design Rationale

### UUID Primary Keys

All tables use `UUID` primary keys generated with `gen_random_uuid()` rather than auto-incrementing integers. This decouples ID generation from the database, allows IDs to be created client-side or in application code without a round-trip, and avoids exposing sequential record counts to the frontend (a minor security consideration). It also makes cross-environment data migrations safer since IDs won't collide.

### categories

The `slug` column stores a URL-friendly version of the category name (e.g., `fresh-produce`). Keeping slug as a separate, unique column rather than deriving it on the fly means routing, filtering, and SEO-friendly URLs can all be resolved with a single indexed lookup without any string manipulation in SQL.

### products

- `category_id` uses `ON DELETE SET NULL` rather than `CASCADE`. If a category is deleted, it is better to keep the products visible (perhaps uncategorized) than to silently wipe inventory. This prevents accidental mass-deletion of products when restructuring the category tree.
- `sku` is enforced unique at the database level as the definitive business identifier for a product. This is the code staff use for purchasing and receiving — it must be stable and collision-free.
- `is_active` is a soft-delete flag. Products are never hard-deleted so that historical order or cart references remain resolvable. Inactive products are simply filtered from customer-facing queries.
- `updated_at` is tracked separately from `created_at` to support cache invalidation and audit trails without a full history table.

### inventory

The `inventory` table is intentionally separated from `products` rather than storing `quantity` directly on the `products` row. This separation reflects the difference in who and how often each table is written to: product details change rarely (admin edits), while stock quantities change on every sale, restock, and adjustment. Separating them avoids row-level lock contention and makes it easier to add inventory-specific features (audit logs, warehouse locations) later without bloating the products table.

- `product_id` carries a `UNIQUE` constraint, enforcing a strict one-to-one relationship. Each product has exactly one stock record.
- `quantity CHECK (quantity >= 0)` is a database-level guard against negative stock, which could otherwise occur under concurrent updates.
- `low_stock_threshold` per product acknowledges that different products have different reorder urgency — a high-turnover staple needs a higher threshold than a niche specialty item.
- `last_updated_by` records the staff member's identifier (name or ID) who last touched stock, providing a lightweight audit trail without a full event-sourcing system.

### users

The `users` table is intentionally thin. Identity and authentication are delegated entirely to AWS Cognito — the application never stores passwords. The `cognito_sub` column is the stable, immutable identifier Cognito issues per user and is the join key between the auth provider and the application database. Email is mirrored here to avoid a Cognito API call on every request, but Cognito remains the source of truth for auth state.

The `role` column (`'customer'` or `'admin'`) controls authorization within the app. Storing it in the application database rather than in Cognito custom attributes keeps role checks local and fast, and makes it easy to update roles through admin tooling without calling the Cognito API.

### cart_items

- The `UNIQUE(user_id, product_id)` composite constraint prevents duplicate cart rows for the same product. The application handles "add to cart when already present" as a quantity increment via `ON CONFLICT DO UPDATE` (upsert), rather than inserting a second row.
- Both foreign keys use `ON DELETE CASCADE` so that deleting a user or removing a product automatically cleans up their cart state, preventing orphaned rows.
- There is no `orders` or `order_items` table yet. The current schema represents a pre-checkout shopping cart. An order history table would be added when checkout functionality is implemented, at which point `cart_items` would be converted into a completed order and then cleared.
