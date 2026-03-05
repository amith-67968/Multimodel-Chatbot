-- ============================================================
-- Conversations Metadata Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

create table if not exists conversation_metadata (
  id uuid default gen_random_uuid() primary key,
  session_id text not null unique,
  user_id uuid not null,
  title text not null default 'New Chat',
  created_at timestamptz default now()
);

-- Index for fast user-specific lookups ordered by time
create index if not exists idx_conversation_metadata_user
  on conversation_metadata(user_id, created_at desc);
