-- MONEYTRACE privacy-first usage analytics
-- Run this script in Supabase Dashboard -> SQL Editor.
-- Tracks only account UUID, coarse event name, optional feature name and timestamp.
-- No financial amounts, descriptions, emails, device IDs, or transaction payloads.

create table if not exists public.app_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in ('app_open','feature_view','transaction_created')),
  feature_name text,
  created_at timestamptz not null default now(),
  constraint app_usage_events_feature_name_length
    check (feature_name is null or char_length(feature_name) <= 80)
);

create index if not exists app_usage_events_created_at_idx
  on public.app_usage_events (created_at desc);
create index if not exists app_usage_events_user_created_idx
  on public.app_usage_events (user_id, created_at desc);

alter table public.app_usage_events enable row level security;

revoke all on public.app_usage_events from anon;
grant insert, select on public.app_usage_events to authenticated;
grant usage, select on sequence public.app_usage_events_id_seq to authenticated;

-- Drop both historical policy names so this script remains safe to re-run
-- after either earlier version of the setup script.
drop policy if exists "Users can insert their own usage events" on public.app_usage_events;
drop policy if exists "users insert own analytics events" on public.app_usage_events;
create policy "Users can insert their own usage events"
  on public.app_usage_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Only admins can read usage events" on public.app_usage_events;
drop policy if exists "admins read analytics events" on public.app_usage_events;
create policy "Only admins can read usage events"
  on public.app_usage_events
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- No UPDATE or DELETE policies are intentionally provided.
