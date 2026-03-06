-- ============================================================
-- Analytics Migration: Track feature usage and response times
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

create table if not exists analytics_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  feature text not null check (feature in ('text', 'voice', 'image', 'pdf')),
  response_time_ms integer,
  model text,
  created_at timestamptz default now()
);

-- Index for time-based aggregation queries
create index if not exists idx_analytics_events_created
  on analytics_events(created_at);

-- Index for feature breakdown queries
create index if not exists idx_analytics_events_feature
  on analytics_events(feature);

-- Index for user-specific analytics
create index if not exists idx_analytics_events_user
  on analytics_events(user_id);

-- ── RPC Functions for Dashboard Queries ──────────────────────

-- Feature breakdown: count events per feature type
create or replace function analytics_feature_breakdown()
returns table (feature text, count bigint)
language sql stable
as $$
  select feature, count(*) as count
  from analytics_events
  group by feature
  order by count desc;
$$;

-- Average response time across all events
create or replace function analytics_avg_response_time()
returns table (avg_ms numeric)
language sql stable
as $$
  select coalesce(avg(response_time_ms), 0) as avg_ms
  from analytics_events
  where response_time_ms is not null;
$$;

-- Daily message counts for the last 30 days
create or replace function analytics_daily_messages()
returns table (date date, count bigint)
language sql stable
as $$
  select created_at::date as date, count(*) as count
  from messages
  where created_at >= now() - interval '30 days'
  group by created_at::date
  order by date;
$$;

-- Model usage breakdown
create or replace function analytics_model_breakdown()
returns table (model text, count bigint)
language sql stable
as $$
  select coalesce(model, 'unknown') as model, count(*) as count
  from analytics_events
  where model is not null
  group by model
  order by count desc;
$$;
