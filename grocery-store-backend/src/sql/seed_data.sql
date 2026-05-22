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

INSERT INTO products (category_id, name, description, price, sku)
VALUES (
  (SELECT id FROM categories WHERE slug = 'dairy-eggs'),
  'Whole Milk',
  'Fresh whole milk, 1 gallon.',
  3.49,
  'DAI-001'
);

INSERT INTO products (category_id, name, description, price, sku)
VALUES (
  (SELECT id FROM categories WHERE slug = 'bakery'),
  'Sourdough Bread',
  'Artisan sourdough loaf, freshly baked.',
  4.99,
  'BAK-001'
);

INSERT INTO products (category_id, name, description, price, sku)
VALUES (
  (SELECT id FROM categories WHERE slug = 'meat-seafood'),
  'Boneless Chicken Breast',
  'Fresh boneless, skinless chicken breast, sold per pound.',
  5.99,
  'MEA-001'
);

INSERT INTO products (category_id, name, description, price, sku)
VALUES (
  (SELECT id FROM categories WHERE slug = 'pantry'),
  'Penne Pasta',
  'Classic penne pasta, 16 oz box.',
  1.49,
  'PAN-001'
);

-- Set initial inventory
INSERT INTO inventory (product_id, quantity, low_stock_threshold)
VALUES (
  (SELECT id FROM products WHERE sku = 'PRD-001'),
  50,
  10
);

INSERT INTO inventory (product_id, quantity, low_stock_threshold)
VALUES (
  (SELECT id FROM products WHERE sku = 'DAI-001'),
  30,
  8
);

INSERT INTO inventory (product_id, quantity, low_stock_threshold)
VALUES (
  (SELECT id FROM products WHERE sku = 'BAK-001'),
  20,
  5
);

INSERT INTO inventory (product_id, quantity, low_stock_threshold)
VALUES (
  (SELECT id FROM products WHERE sku = 'MEA-001'),
  40,
  10
);

INSERT INTO inventory (product_id, quantity, low_stock_threshold)
VALUES (
  (SELECT id FROM products WHERE sku = 'PAN-001'),
  100,
  15
);

