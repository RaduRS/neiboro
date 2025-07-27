-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  profile_image_url TEXT,
  postcode TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('help_needed', 'help_offered')),
  postcode TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_responses table (for "I can help" interactions)
CREATE TABLE post_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL DEFAULT 'offer_help' CHECK (response_type IN ('offer_help', 'comment')),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, response_type) -- Prevent duplicate help offers from same user
);

-- Create chat_sessions table (for private conversations)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  post_owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  helper_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, helper_id) -- One chat session per helper per post
);

-- Create chat_messages table (for messages within chat sessions)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create neighborhoods table
CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postcode TEXT UNIQUE NOT NULL,
  area_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_neighborhoods table (many-to-many relationship)
CREATE TABLE user_neighborhoods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, neighborhood_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_postcode ON users(postcode);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_postcode ON posts(postcode);
CREATE INDEX idx_posts_type ON posts(post_type);
CREATE INDEX idx_posts_active ON posts(is_active);
CREATE INDEX idx_post_responses_post_id ON post_responses(post_id);
CREATE INDEX idx_post_responses_user_id ON post_responses(user_id);
CREATE INDEX idx_post_responses_read ON post_responses(is_read);
CREATE INDEX idx_chat_sessions_post_id ON chat_sessions(post_id);
CREATE INDEX idx_chat_sessions_post_owner ON chat_sessions(post_owner_id);
CREATE INDEX idx_chat_sessions_helper ON chat_sessions(helper_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_read ON chat_messages(is_read);
CREATE INDEX idx_user_neighborhoods_user_id ON user_neighborhoods(user_id);
CREATE INDEX idx_user_neighborhoods_neighborhood_id ON user_neighborhoods(neighborhood_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_responses_updated_at BEFORE UPDATE ON post_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_neighborhoods_updated_at BEFORE UPDATE ON neighborhoods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_neighborhoods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own data and other users' basic info
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid()::text = clerk_id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid()::text = clerk_id);
CREATE POLICY "Users can view basic info of others" ON users FOR SELECT USING (true);

-- Posts are viewable by users in the same postcode
CREATE POLICY "Users can view posts in their postcode" ON posts FOR SELECT USING (
  postcode IN (SELECT postcode FROM users WHERE clerk_id = auth.uid()::text)
);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (
  user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);

-- Post responses are viewable by post owner and responder
CREATE POLICY "Users can view responses to their posts" ON post_responses FOR SELECT USING (
  post_id IN (SELECT id FROM posts WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text))
  OR user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);
CREATE POLICY "Users can create responses" ON post_responses FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);
CREATE POLICY "Users can update their own responses" ON post_responses FOR UPDATE USING (
  user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);

-- Chat sessions - only post owner can create, both participants can view
CREATE POLICY "Post owners can create chat sessions" ON chat_sessions FOR INSERT WITH CHECK (
  post_owner_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);
CREATE POLICY "Participants can view their chat sessions" ON chat_sessions FOR SELECT USING (
  post_owner_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  OR helper_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);
CREATE POLICY "Post owners can update chat sessions" ON chat_sessions FOR UPDATE USING (
  post_owner_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);

-- Chat messages - participants can create and view
CREATE POLICY "Participants can view chat messages" ON chat_messages FOR SELECT USING (
  chat_session_id IN (
    SELECT id FROM chat_sessions 
    WHERE post_owner_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    OR helper_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  )
);
CREATE POLICY "Participants can create chat messages" ON chat_messages FOR INSERT WITH CHECK (
  sender_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  AND chat_session_id IN (
    SELECT id FROM chat_sessions 
    WHERE post_owner_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    OR helper_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
  )
);
CREATE POLICY "Users can update their own messages" ON chat_messages FOR UPDATE USING (
  sender_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);

-- Neighborhoods are readable by all authenticated users
CREATE POLICY "Authenticated users can view neighborhoods" ON neighborhoods FOR SELECT TO authenticated USING (true);

-- User neighborhoods are manageable by the user themselves
CREATE POLICY "Users can manage their neighborhoods" ON user_neighborhoods FOR ALL USING (
  user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
);