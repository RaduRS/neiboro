-- Fix the INSERT policy for post_responses
-- The current policy is too restrictive and blocking valid inserts

-- Drop any existing INSERT policies
DROP POLICY IF EXISTS "Users can create responses to posts in their cluster" ON post_responses;
DROP POLICY IF EXISTS "Users can create their own responses" ON post_responses;
DROP POLICY IF EXISTS "Allow authenticated users to create responses" ON post_responses;

-- Create a more permissive INSERT policy
-- Allow authenticated users to create responses
CREATE POLICY "Allow authenticated users to create responses" ON post_responses
  FOR INSERT WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    -- The user_id in the response must match a user with the same clerk_id as the authenticated user
    AND user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.uid()::text
    )
  );