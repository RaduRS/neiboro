-- Drop the public_users view first since it depends on the users table
DROP VIEW IF EXISTS public_users;

-- First, drop the last_name column if it exists (in case it was added at the end)
ALTER TABLE users DROP COLUMN IF EXISTS last_name;

-- Add last_name column right after first_name by recreating the table structure
-- We'll use a transaction to ensure data safety
BEGIN;

-- Create a temporary table with the correct column order
CREATE TABLE users_temp AS 
SELECT 
  id,
  clerk_id,
  cluster_id,
  email,
  first_name,
  NULL::TEXT as last_name,  -- Add last_name after first_name
  profile_image_url,
  address_line1,
  address_line2,
  city,
  role,
  created_at,
  updated_at
FROM users;

-- Drop the original table
DROP TABLE users CASCADE;

-- Rename temp table to users
ALTER TABLE users_temp RENAME TO users;

-- Recreate all constraints and indexes
ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_clerk_id_key UNIQUE (clerk_id);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
ALTER TABLE users ALTER COLUMN clerk_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Recreate indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cluster_id ON users(cluster_id);
CREATE INDEX idx_users_role ON users(role);

-- Recreate the updated_at trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policy
CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (id = get_current_user_id());

COMMIT;

-- Recreate the public_users view to include last_name
CREATE VIEW public_users AS
SELECT 
  id,
  first_name,
  last_name,
  profile_image_url,
  cluster_id
FROM users;

-- Confirmation message
SELECT 'last_name field added successfully after first_name in users table and public_users view updated!' as status;