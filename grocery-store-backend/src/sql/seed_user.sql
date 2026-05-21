-- Insert sample user
INSERT INTO users (cognito_sub, email, role)
VALUES (
  'test-sub-001', 'test@example.com', 'customer'
)
RETURNING id;