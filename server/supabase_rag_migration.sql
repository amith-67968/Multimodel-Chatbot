-- ============================================================
-- RAG Migration: Enable pgvector and create document tables
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- Enable pgvector extension
create extension if not exists vector;

-- Document metadata table (per-user isolation)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  filename text not null,
  page_count integer,
  file_size integer,
  chunk_count integer default 0,
  created_at timestamptz default now()
);

-- Index for fast user-specific lookups
create index idx_documents_user_id on documents(user_id);

-- Document chunks with embeddings
create table if not exists document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(384),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Indexes for fast lookups and similarity search
create index idx_document_chunks_user_id on document_chunks(user_id);
create index idx_document_chunks_document_id on document_chunks(document_id);

-- HNSW index for vector similarity search
create index idx_document_chunks_embedding on document_chunks
  using hnsw (embedding vector_cosine_ops);

-- RPC function for similarity search
create or replace function match_document_chunks(
  query_embedding vector(384),
  match_user_id uuid,
  match_document_id uuid,
  match_count int default 5,
  match_threshold float default 0.3
)
returns table (
  id uuid,
  chunk_index integer,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.user_id = match_user_id
    and dc.document_id = match_document_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
