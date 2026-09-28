-- ========================================================
-- CCNA NOTES - SUPABASE DATABASE SCHEMA MIGRATION
-- Copy và dán toàn bộ đoạn code này vào Supabase SQL Editor rồi bấm RUN.
-- ========================================================

-- 1. Bảng Bài Học (Lessons)
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  blocks JSONB DEFAULT '[]'::jsonb,
  related_command_ids TEXT[] DEFAULT '{}',
  topology_id TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Bộ Lệnh Cisco (Cisco Commands)
CREATE TABLE IF NOT EXISTS cisco_commands (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  device TEXT NOT NULL,
  mode TEXT NOT NULL,
  example TEXT,
  notes TEXT,
  image_url TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bảng Mô Hình Mạng (Topologies)
CREATE TABLE IF NOT EXISTS topologies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  nodes JSONB DEFAULT '[]'::jsonb,
  links JSONB DEFAULT '[]'::jsonb,
  devices TEXT[] DEFAULT '{}',
  ip_list JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  related_command_ids TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng Ghi Chú Cá Nhân (Personal Notes)
CREATE TABLE IF NOT EXISTS personal_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn on Row Level Security (RLS) & allow anonymous access for personal app
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cisco_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE topologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access on lessons" ON lessons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on cisco_commands" ON cisco_commands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on topologies" ON topologies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on personal_notes" ON personal_notes FOR ALL USING (true) WITH CHECK (true);
