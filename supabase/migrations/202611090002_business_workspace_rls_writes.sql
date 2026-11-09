-- Use explicit owner-scoped RLS policies for workspace writes.
-- No SECURITY DEFINER write RPC is needed for this account-private data row.
drop function if exists public.mt_save_business_workspace(jsonb, integer);

drop policy if exists mt_business_workspace_insert_own on public.mt_business_workspace_data;
create policy mt_business_workspace_insert_own
  on public.mt_business_workspace_data
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists mt_business_workspace_update_own on public.mt_business_workspace_data;
create policy mt_business_workspace_update_own
  on public.mt_business_workspace_data
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.mt_business_workspace_data from anon, authenticated;
grant select, insert, update on public.mt_business_workspace_data to authenticated;
