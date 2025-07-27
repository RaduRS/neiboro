-- =====================================================
-- NEIBORO DATABASE SCHEMA - FINAL PRODUCTION VERSION
-- =====================================================
-- Run this entire script in your Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TABLES
-- =====================================================
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postcode TEXT UNIQUE NOT NULL,
  area_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  post_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, helper_id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES & TRIGGERS
-- =====================================================
-- (These are all correct from your script, no changes needed)
CREATE INDEX idx_clusters_postcode ON clusters(postcode);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_cluster_id ON users(cluster_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_post_responses_post_id ON post_responses(post_id);
CREATE INDEX idx_post_responses_user_id ON post_responses(user_id);
CREATE INDEX idx_chat_sessions_post_id ON chat_sessions(post_id);
CREATE INDEX idx_chat_sessions_participants ON chat_sessions(post_owner_id, helper_id);
CREATE INDEX idx_chat_messages_chat_session_id ON chat_messages(chat_session_id);

CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_responses_updated_at BEFORE UPDATE ON post_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS & HELPER FUNCTIONS
-- =====================================================
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE clerk_id = auth.uid()::text;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_current_user_cluster_id()
RETURNS UUID AS $$
  SELECT cluster_id FROM public.users WHERE id = get_current_user_id();
$$ LANGUAGE sql STABLE;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Clusters Policies
CREATE POLICY "Authenticated users can view clusters" ON clusters FOR SELECT TO authenticated USING (true);

-- Users Policies
CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (id = get_current_user_id());

-- Create a secure, public-facing view for basic user info
CREATE VIEW public_users AS
  SELECT id, first_name, profile_image_url, cluster_id FROM users;

-- Public Users View Policy
CREATE POLICY "Users can see public profiles of neighbors" ON public_users
  FOR SELECT USING (cluster_id = get_current_user_cluster_id());

-- Posts Policies
CREATE POLICY "Users can view posts from their own cluster" ON posts FOR SELECT USING (
  (SELECT cluster_id FROM users WHERE id = posts.user_id) = get_current_user_cluster_id()
);
CREATE POLICY "Users can manage their own posts" ON posts FOR ALL USING (user_id = get_current_user_id());

-- Post Responses Policies (FINAL, SIMPLIFIED VERSION)
CREATE POLICY "Post owners can manage responses on their posts" ON post_responses
  FOR ALL USING (post_id IN (SELECT id FROM posts WHERE user_id = get_current_user_id()));
CREATE POLICY "Users can manage their own offers to help" ON post_responses
  FOR ALL USING (user_id = get_current_user_id());

-- Chat Sessions & Messages Policies
CREATE POLICY "Participants can manage their chat sessions" ON chat_sessions
  FOR ALL USING (post_owner_id = get_current_user_id() OR helper_id = get_current_user_id());

CREATE POLICY "Participants can manage their own chat messages" ON chat_messages
  FOR ALL USING (sender_id = get_current_user_id() AND chat_session_id IN (SELECT id FROM chat_sessions));

CREATE POLICY "Participants can read all messages in their chats" ON chat_messages
  FOR SELECT USING (chat_session_id IN (SELECT id FROM chat_sessions));

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Neiboro database setup completed successfully!' as status;

