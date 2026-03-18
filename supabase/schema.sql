-- ProtoPreview Database Schema
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by text not null,
  created_by_id text not null,
  cover_url text
);

-- Comments (top-level and replies via parent_id self-reference)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  x_percent double precision not null default 0,
  y_percent double precision not null default 0,
  anchor jsonb,
  page_url text,
  text text not null,
  author text not null,
  author_id text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  parent_id uuid references comments(id) on delete cascade
);

-- Indexes
create index if not exists idx_comments_project_id on comments(project_id);
create index if not exists idx_comments_parent_id on comments(parent_id);

-- Row Level Security (permissive for MVP — any visitor can read/write)
alter table projects enable row level security;
alter table comments enable row level security;

create policy "Allow all access to projects" on projects for all using (true) with check (true);
create policy "Allow all access to comments" on comments for all using (true) with check (true);

-- Enable Realtime for live collaborative updates
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table comments;

-- Migration: if upgrading from the previous schema, run:
-- alter table comments add column if not exists anchor jsonb;
-- alter table projects add column if not exists cover_url text;
