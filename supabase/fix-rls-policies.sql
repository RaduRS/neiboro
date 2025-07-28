-- CORRECTED FIX FOR CIRCULAR DEPENDENCY IN RLS POLICIES
-- Run this script to fix the "stack depth limit exceeded" error

-- First, drop the existing problematic policy
DROP POLICY IF EXISTS "Users can manage their own data" ON users;

-- Create new policies that avoid circular dependency
CREATE POLICY "Users can view their own data" ON users 
  FOR SELECT USING (id = get_current_user_id());

CREATE POLICY "Users can update their own data" ON users 
  FOR UPDATE USING (id = get_current_user_id());

-- CORRECTED: Use WITH CHECK for INSERT operations
CREATE POLICY "Service role can insert users" ON users 
  FOR INSERT TO service_role WITH CHECK (true);

-- CORRECTED: FOR ALL policies need both USING and WITH CHECK
CREATE POLICY "Service role can manage users" ON users 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT 'RLS policies updated successfully - circular dependency fixed!' as status;
