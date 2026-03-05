-- ============================================================
-- Messages Migration: Create persistent message storage
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  session_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Composite index for fast ordered lookups per session
create index if not exists idx_messages_session_created
  on messages(session_id, created_at);
