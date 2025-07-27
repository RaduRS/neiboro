-- Fix RLS policies to allow webhook operations
-- This allows the Clerk webhook to create and update users without authentication

-- Drop existing RLS policy
DROP POLICY IF EXISTS "Users can manage their own data" ON users;

-- Create new policies that allow webhook operations
-- Allow authenticated users to read their own data
CREATE POLICY "Users can read their own data" ON users 
  FOR SELECT USING (auth.uid()::text = clerk_id OR auth.role() = 'anon');

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update their own data" ON users 
  FOR UPDATE USING (auth.uid()::text = clerk_id);

-- Allow anonymous (webhook) access for INSERT operations
CREATE POLICY "Allow webhook user creation" ON users 
  FOR INSERT WITH CHECK (true);

-- Allow anonymous (webhook) access for UPDATE operations when no auth.uid() exists
CREATE POLICY "Allow webhook user updates" ON users 
  FOR UPDATE USING (auth.uid() IS NULL);

-- Allow anonymous (webhook) access for DELETE operations
CREATE POLICY "Allow webhook user deletion" ON users 
  FOR DELETE USING (auth.uid() IS NULL OR auth.uid()::text = clerk_id);

-- Confirmation message
SELECT 'RLS policies updated to allow webhook operations!' as status;