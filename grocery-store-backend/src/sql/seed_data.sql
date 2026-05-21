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

