-- MONEYTRACE privacy-first usage analytics
-- Run this script in Supabase SQL Editor.
-- Tracks only account UUID, coarse event name and timestamp. No financial data or PII.
create table if not exists public.app_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (event_name in ('app_open','feature_view','transaction_created')),
  feature_name text check (feature_name is null or feature_name in ('overview','transactions','subscriptions','insights','connect','business')),
  created_at timestamptz not null default now()
);
create index if not exists app_usage_events_created_at_idx on public.app_usage_events (created_at desc);
create index if not exists app_usage_events_user_created_idx on public.app_usage_events (user_id, created_at desc);
alter table public.app_usage_events enable row level security;
revoke all on public.app_usage_events from anon;
grant insert, select on public.app_usage_events to authenticated;
drop policy if exists "users insert own analytics events" on public.app_usage_events;
create policy "users insert own analytics events"
on public.app_usage_events for insert to authenticated
with check (auth.uid() = user_id);
drop policy if exists "admins read analytics events" on public.app_usage_events;
create policy "admins read analytics events"
on public.app_usage_events for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
-- No update/delete policies: analytics events are append-only for client users.
