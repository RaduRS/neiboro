-- Fix circular dependency in RLS policies
-- This script removes the circular dependency by using auth.uid() directly in policies

-- Drop all existing RLS policies that use helper functions
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can view posts from their own cluster" ON posts;
DROP POLICY IF EXISTS "Users can manage their own posts" ON posts;
DROP POLICY IF EXISTS "Users can view post responses" ON post_responses;
DROP POLICY IF EXISTS "Users can create their own responses" ON post_responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON post_responses;
DROP POLICY IF EXISTS "Post owners can update responses on their posts" ON post_responses;
DROP POLICY IF EXISTS "Users can delete their own responses" ON post_responses;
DROP POLICY IF EXISTS "Post owners can delete responses on their posts" ON post_responses;
DROP POLICY IF EXISTS "Participants can manage their chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Participants can manage their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can read all messages in their chats" ON chat_messages;

-- Create new policies that avoid circular dependencies
-- Users table policies - use auth.uid() directly
CREATE POLICY "Users can view their own data" ON users 
  FOR SELECT USING (clerk_id = auth.uid()::text);

CREATE POLICY "Users can update their own data" ON users 
  FOR UPDATE USING (clerk_id = auth.uid()::text);

-- Posts table policies - use auth.uid() directly
CREATE POLICY "Users can view posts from their own cluster" ON posts 
  FOR SELECT USING (
    (SELECT cluster_id FROM users WHERE clerk_id = auth.uid()::text) = 
    (SELECT cluster_id FROM users WHERE id = posts.user_id)
  );

CREATE POLICY "Users can manage their own posts" ON posts 
  FOR ALL USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Post responses policies - use auth.uid() directly
CREATE POLICY "Users can view post responses" ON post_responses
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    OR post_id IN (
      SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

CREATE POLICY "Users can create their own responses" ON post_responses
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Users can update their own responses" ON post_responses
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Post owners can update responses on their posts" ON post_responses
  FOR UPDATE USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

CREATE POLICY "Users can delete their own responses" ON post_responses
  FOR DELETE USING (user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

CREATE POLICY "Post owners can delete responses on their posts" ON post_responses
  FOR DELETE USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

-- Chat sessions policies - use auth.uid() directly
CREATE POLICY "Participants can manage their chat sessions" ON chat_sessions
  FOR ALL USING (
    post_owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text) 
    OR helper_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  );

-- Chat messages policies - use auth.uid() directly
CREATE POLICY "Participants can manage their own chat messages" ON chat_messages
  FOR ALL USING (
    sender_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    AND session_id IN (
      SELECT id FROM chat_sessions 
      WHERE post_owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
         OR helper_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );

CREATE POLICY "Participants can read all messages in their chats" ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE post_owner_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
         OR helper_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
  );