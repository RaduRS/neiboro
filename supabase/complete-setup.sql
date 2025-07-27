-- =====================================================
-- NEIBORO DATABASE SCHEMA - COMPLETE SETUP
-- =====================================================
-- Run this entire script in your Supabase SQL Editor
-- This will create all tables, indexes, triggers, and policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================
-- Create clusters table (replaces neighborhoods)
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postcode TEXT UNIQUE NOT NULL,
  area_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  -- REFINEMENT: A user can't be deleted if a cluster is, so their cluster is set to NULL.
  cluster_id UUID REFERENCES clusters(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  -- Added detailed address fields
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- REFINEMENT: Added NOT NULL for data integrity. A post MUST have a user.
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('help_needed', 'help_offered')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_responses table
-- REFINEMENT: Simplified this table for a clearer "offer help" workflow.
CREATE TABLE post_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- A user can only offer to help on a post once.
);

-- Create chat_sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- REFINEMENT: A chat is directly linked to the two participating users, triggered by an accepted response.
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  post_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, helper_id)
);

-- Create chat_messages table (for messages within chat sessions)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_clusters_postcode ON clusters(postcode);
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_cluster_id ON users(cluster_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_type ON posts(post_type);
CREATE INDEX idx_posts_active ON posts(is_active);
CREATE INDEX idx_post_responses_post_id ON post_responses(post_id);
CREATE INDEX idx_post_responses_user_id ON post_responses(user_id);
CREATE INDEX idx_post_responses_status ON post_responses(status);
CREATE INDEX idx_chat_sessions_post_id ON chat_sessions(post_id);
CREATE INDEX idx_chat_sessions_post_owner ON chat_sessions(post_owner_id);
CREATE INDEX idx_chat_sessions_helper ON chat_sessions(helper_id);
CREATE INDEX idx_chat_sessions_participants ON chat_sessions(post_owner_id, helper_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_clusters_updated_at BEFORE UPDATE ON clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_responses_updated_at BEFORE UPDATE ON post_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable Row Level Security (RLS)
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE clerk_id = auth.uid()::text;
$$ LANGUAGE sql STABLE;

-- Helper function to get current user's cluster ID
CREATE OR REPLACE FUNCTION get_current_user_cluster_id()
RETURNS UUID AS $$
  SELECT cluster_id FROM public.users WHERE id = get_current_user_id();
$$ LANGUAGE sql STABLE;

-- Clusters policies
CREATE POLICY "Authenticated users can view clusters" ON clusters FOR SELECT TO authenticated USING (true);

-- Users policies
CREATE POLICY "Users can manage their own data" ON users FOR ALL USING (id = get_current_user_id());

-- Create public_users view for safe public access
CREATE VIEW public_users AS
SELECT 
  id,
  first_name,
  last_name,
  profile_image_url,
  cluster_id
FROM users;

-- Posts policies
CREATE POLICY "Users can view posts in their cluster" ON posts 
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE cluster_id = get_current_user_cluster_id())
  );

CREATE POLICY "Users can manage their own posts" ON posts 
  FOR ALL USING (user_id = get_current_user_id());

-- Post responses policies
CREATE POLICY "Post owners can manage responses on their posts" ON post_responses 
  FOR ALL USING (post_id IN (SELECT id FROM posts WHERE user_id = get_current_user_id()));

CREATE POLICY "Users can manage their own offers to help" ON post_responses 
  FOR ALL USING (user_id = get_current_user_id());

-- Chat sessions policies
CREATE POLICY "Users can manage chat sessions they participate in" ON chat_sessions 
  FOR ALL USING (
    post_owner_id = get_current_user_id() OR helper_id = get_current_user_id()
  );

-- Chat messages policies
CREATE POLICY "Users can manage messages in their chat sessions" ON chat_messages 
  FOR ALL USING (
    chat_session_id IN (
      SELECT id FROM chat_sessions 
      WHERE post_owner_id = get_current_user_id() OR helper_id = get_current_user_id()
    )
  );

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert some sample clusters (optional)
INSERT INTO clusters (postcode, area_name) VALUES
  ('SW1A', 'Westminster'),
  ('E1', 'Whitechapel'),
  ('N1', 'Islington'),
  ('W1', 'Marylebone'),
  ('SE1', 'Southwark')
ON CONFLICT (postcode) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This script creates a production-ready database schema for Neiboro with:
-- 1. Proper data integrity (NOT NULL constraints on foreign keys)
-- 2. Simplified schema (status-based post_responses, direct chat_sessions linking)
-- 3. Optimized RLS policies (using helper functions and FOR ALL policies)
-- 4. Performance indexes (including composite indexes for common queries)
-- 5. Clean MVP structure (removed is_read field for simplicity)
-- 6. Complete CRUD permissions (SELECT, INSERT, UPDATE, DELETE)
-- 
-- The schema is now ready for production deployment with excellent
-- performance, security, and maintainability characteristics.

SELECT 'Neiboro database setup completed successfully with production improvements!' as status;