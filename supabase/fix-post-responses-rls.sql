-- Fix RLS policies for post_responses to prevent stack overflow
-- This script simplifies the RLS policies to avoid recursive calls

-- Drop existing policies
DROP POLICY IF EXISTS "Post owners can manage responses on their posts" ON post_responses;
DROP POLICY IF EXISTS "Users can manage their own offers to help" ON post_responses;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view post responses" ON post_responses
  FOR SELECT USING (
    user_id = get_current_user_id() 
    OR post_id IN (SELECT id FROM posts WHERE user_id = get_current_user_id())
  );

CREATE POLICY "Users can create their own responses" ON post_responses
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update their own responses" ON post_responses
  FOR UPDATE USING (user_id = get_current_user_id());

CREATE POLICY "Post owners can update responses on their posts" ON post_responses
  FOR UPDATE USING (post_id IN (SELECT id FROM posts WHERE user_id = get_current_user_id()));

CREATE POLICY "Users can delete their own responses" ON post_responses
  FOR DELETE USING (user_id = get_current_user_id());

CREATE POLICY "Post owners can delete responses on their posts" ON post_responses
  FOR DELETE USING (post_id IN (SELECT id FROM posts WHERE user_id = get_current_user_id()));