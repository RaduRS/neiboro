-- NEIBORO DATABASE - SIMPLIFIED SECURITY APPROACH
-- Run this entire script as one command

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create all tables
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postcode TEXT UNIQUE NOT NULL,
  area_name TEXT,
  city TEXT,
  county TEXT,
  country TEXT DEFAULT 'United Kingdom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('help_needed', 'help_offered')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE post_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('offer_help', 'comment')),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to allow multiple comments but only one help offer per user per post
CREATE UNIQUE INDEX idx_post_responses_unique_help_offer 
ON post_responses (post_id, user_id) 
WHERE response_type = 'offer_help';

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_response_id UUID NOT NULL REFERENCES post_responses(id) ON DELETE CASCADE,
  post_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_response_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_clusters_postcode ON clusters(postcode);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_cluster_id ON users(cluster_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_post_responses_post_id ON post_responses(post_id);
CREATE INDEX idx_post_responses_user_id ON post_responses(user_id);
CREATE INDEX idx_chat_sessions_post_response_id ON chat_sessions(post_response_id);
CREATE INDEX idx_chat_sessions_participants ON chat_sessions(post_owner_id, helper_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);

-- Create triggers
CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_responses_updated_at BEFORE UPDATE ON post_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create helper functions
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE clerk_id = auth.uid()::text;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_current_user_cluster_id()
RETURNS UUID AS $$
  SELECT cluster_id FROM public.users WHERE id = get_current_user_id();
$$ LANGUAGE sql STABLE;

-- Create RLS policies (NO POLICIES ON VIEWS)
CREATE POLICY "Authenticated users can view clusters" ON clusters FOR SELECT TO authenticated USING (true);

-- Users table policies - avoid circular dependency
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (id = get_current_user_id());
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (id = get_current_user_id());
CREATE POLICY "Service role can insert users" ON users FOR INSERT TO service_role USING (true);
CREATE POLICY "Service role can manage users" ON users FOR ALL TO service_role USING (true);

CREATE POLICY "Users can view posts from their own cluster" ON posts FOR SELECT USING (
  (SELECT cluster_id FROM users WHERE id = posts.user_id) = get_current_user_cluster_id()
);
CREATE POLICY "Users can manage their own posts" ON posts FOR ALL USING (user_id = get_current_user_id());

-- Post responses policies - simplified to avoid recursion
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

CREATE POLICY "Participants can manage their chat sessions" ON chat_sessions
  FOR ALL USING (post_owner_id = get_current_user_id() OR helper_id = get_current_user_id());

CREATE POLICY "Participants can manage their own chat messages" ON chat_messages
  FOR ALL USING (
    sender_id = get_current_user_id() 
    AND session_id IN (
      SELECT id FROM chat_sessions 
      WHERE post_owner_id = get_current_user_id() OR helper_id = get_current_user_id()
    )
  );
CREATE POLICY "Participants can read all messages in their chats" ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE post_owner_id = get_current_user_id() OR helper_id = get_current_user_id()
    )
  );

-- Create the view WITHOUT any RLS policies - let the underlying table handle security
CREATE VIEW public_users AS
  SELECT id, first_name, last_name, profile_image_url, cluster_id 
  FROM users 
  WHERE cluster_id = get_current_user_cluster_id();

SELECT 'Neiboro database setup completed successfully!' as status;
