-- Supabase Database Setup Script
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create user_settings table
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  UNIQUE(user_id, setting_key)
);

-- Create emails table
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sender VARCHAR(255) NOT NULL,
  recipients TEXT[] NOT NULL,
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  message_id VARCHAR(255) UNIQUE,
  thread_id VARCHAR(255),
  folder VARCHAR(100) DEFAULT 'inbox',
  labels TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_folder ON emails(folder);
CREATE INDEX idx_emails_sent_at ON emails(sent_at);
CREATE INDEX idx_emails_sender ON emails(sender);
CREATE INDEX idx_emails_user_read ON emails(user_id, is_read);
CREATE INDEX idx_emails_user_starred ON emails(user_id, is_starred);

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Create policies for user_settings table
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Create policies for emails table
CREATE POLICY "Users can view own emails" ON emails
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own emails" ON emails
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own emails" ON emails
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own emails" ON emails
  FOR DELETE USING (auth.uid()::text = user_id::text); 