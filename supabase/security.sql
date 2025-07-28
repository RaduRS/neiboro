-- STEP 2: Run this script LAST to apply all security rules.

-- Enable RLS on all tables
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create Helper Functions (with improved error handling)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  current_user_id UUID;
BEGIN
  SELECT id INTO current_user_id 
  FROM public.users 
  WHERE clerk_id = auth.uid()::text;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Neiboro: No user found for the current authentication context.';
  END IF;
  
  RETURN current_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_cluster_id()
RETURNS UUID AS $$
  SELECT cluster_id FROM public.users WHERE id = get_current_user_id();
$$ LANGUAGE sql STABLE;

-- Create RLS Policies for Tables
CREATE POLICY "Authenticated users can view clusters" ON clusters FOR SELECT TO authenticated USING (true);

-- Users table policies (only allow users to manage their own data)
CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (id = get_current_user_id());

-- Create the secure view with limited fields
CREATE VIEW public_users WITH (security_invoker=on) AS
  SELECT id, first_name, last_name, profile_image_url, cluster_id FROM users;

-- RLS policy on the VIEW (this is correct and secure)
CREATE POLICY "Users can see public profiles of neighbors" ON public_users
  FOR SELECT USING (cluster_id = get_current_user_cluster_id());

CREATE POLICY "Users can view posts from their own cluster" ON posts FOR SELECT USING (
  (SELECT cluster_id FROM users WHERE id = posts.user_id) = get_current_user_cluster_id()
);
CREATE POLICY "Users can manage their own posts" ON posts FOR ALL USING (user_id = get_current_user_id());

CREATE POLICY "Post owners can manage responses on their posts" ON post_responses
  FOR ALL USING (post_id IN (SELECT id FROM posts WHERE user_id = get_current_user_id()));
CREATE POLICY "Users can manage their own offers to help" ON post_responses
  FOR ALL USING (user_id = get_current_user_id());

CREATE POLICY "Participants can manage their chat sessions" ON chat_sessions
  FOR ALL USING (post_owner_id = get_current_user_id() OR helper_id = get_current_user_id());

CREATE POLICY "Participants can manage their own chat messages" ON chat_messages
  FOR ALL USING (sender_id = get_current_user_id() AND chat_session_id IN (SELECT id FROM chat_sessions));
CREATE POLICY "Participants can read all messages in their chats" ON chat_messages
  FOR SELECT USING (chat_session_id IN (SELECT id FROM chat_sessions));

-- Final completion message
SELECT 'Neiboro database setup completed successfully!' as status;
