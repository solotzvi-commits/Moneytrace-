-- Private, account-scoped cloud backup for the Business Mode workspace.
-- Clients can read only their own row. Writes go through a revision-checked RPC.
create table if not exists public.mt_business_workspace_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint mt_business_workspace_payload_size check (pg_column_size(payload) <= 1048576)
);

alter table public.mt_business_workspace_data enable row level security;

drop policy if exists mt_business_workspace_select_own on public.mt_business_workspace_data;
create policy mt_business_workspace_select_own
  on public.mt_business_workspace_data
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.mt_business_workspace_data from anon, authenticated;
grant select on public.mt_business_workspace_data to authenticated;

create or replace function public.mt_save_business_workspace(p_payload jsonb, p_expected_revision integer default 0)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_revision integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Workspace payload must be a JSON object' using errcode = '22023';
  end if;
  if pg_column_size(p_payload) > 1048576 then
    raise exception 'Workspace payload exceeds 1 MB' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid workspace revision' using errcode = '22023';
  end if;

  insert into public.mt_business_workspace_data(user_id, payload, revision, updated_at)
  values (v_user_id, p_payload, 1, now())
  on conflict (user_id) do update
    set payload = excluded.payload,
        revision = public.mt_business_workspace_data.revision + 1,
        updated_at = now()
    where public.mt_business_workspace_data.revision = p_expected_revision
  returning revision into v_revision;

  if v_revision is null then
    raise exception 'Workspace changed on another device. Reload before saving again.'
      using errcode = '40001';
  end if;
  return v_revision;
end;
$$;

revoke all on function public.mt_save_business_workspace(jsonb, integer) from public, anon;
grant execute on function public.mt_save_business_workspace(jsonb, integer) to authenticated;
