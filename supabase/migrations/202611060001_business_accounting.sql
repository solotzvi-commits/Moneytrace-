-- MONEYTRACE multi-tenant accounting foundation.
-- Apply through the Supabase SQL editor after reviewing the target project.
create extension if not exists pgcrypto;

create table if not exists public.mt_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  currency char(3) not null default 'ILS',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.mt_business_members (
  business_id uuid not null references public.mt_businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','admin','accountant','bookkeeper','viewer')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);
create index if not exists mt_business_members_user_idx on public.mt_business_members(user_id);

create table if not exists public.mt_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mt_businesses(id) on delete cascade,
  code text not null check (code ~ '^[0-9A-Z-]{2,20}$'),
  name text not null check (length(trim(name)) between 1 and 160),
  account_type text not null check (account_type in ('asset','liability','equity','income','expense')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id,code),
  unique (business_id,id)
);

create table if not exists public.mt_journal_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.mt_businesses(id) on delete cascade,
  entry_number bigint generated always as identity,
  entry_date date not null,
  memo text not null check (length(trim(memo)) between 1 and 500),
  source text not null default 'manual' check (source in ('manual','invoice','bill','bank_import','payroll','inventory','adjustment','reversal')),
  external_reference text,
  reversal_of uuid references public.mt_journal_entries(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (business_id,entry_number),
  unique (business_id,id)
);
create index if not exists mt_journal_entries_business_date_idx on public.mt_journal_entries(business_id,entry_date desc);

create table if not exists public.mt_journal_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  journal_entry_id uuid not null,
  account_id uuid not null,
  description text,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  foreign key (business_id,journal_entry_id) references public.mt_journal_entries(business_id,id) on delete restrict,
  foreign key (business_id,account_id) references public.mt_accounts(business_id,id) on delete restrict,
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);
create index if not exists mt_journal_lines_entry_idx on public.mt_journal_lines(journal_entry_id);
create index if not exists mt_journal_lines_account_idx on public.mt_journal_lines(business_id,account_id);

create table if not exists public.mt_audit_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.mt_businesses(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists mt_audit_events_business_created_idx on public.mt_audit_events(business_id,created_at desc);

create or replace function public.mt_is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.mt_business_members m where m.business_id=p_business_id and m.user_id=auth.uid()) $$;

create or replace function public.mt_business_role(p_business_id uuid)
returns text language sql stable security definer set search_path = public
as $$ select m.role from public.mt_business_members m where m.business_id=p_business_id and m.user_id=auth.uid() limit 1 $$;

alter table public.mt_businesses enable row level security;
alter table public.mt_business_members enable row level security;
alter table public.mt_accounts enable row level security;
alter table public.mt_journal_entries enable row level security;
alter table public.mt_journal_lines enable row level security;
alter table public.mt_audit_events enable row level security;

drop policy if exists mt_business_read on public.mt_businesses;
create policy mt_business_read on public.mt_businesses for select to authenticated using (public.mt_is_business_member(id));
drop policy if exists mt_members_read on public.mt_business_members;
create policy mt_members_read on public.mt_business_members for select to authenticated using (public.mt_is_business_member(business_id));
drop policy if exists mt_accounts_read on public.mt_accounts;
create policy mt_accounts_read on public.mt_accounts for select to authenticated using (public.mt_is_business_member(business_id));
drop policy if exists mt_journal_entries_read on public.mt_journal_entries;
create policy mt_journal_entries_read on public.mt_journal_entries for select to authenticated using (public.mt_is_business_member(business_id));
drop policy if exists mt_journal_lines_read on public.mt_journal_lines;
create policy mt_journal_lines_read on public.mt_journal_lines for select to authenticated using (public.mt_is_business_member(business_id));
drop policy if exists mt_audit_read on public.mt_audit_events;
create policy mt_audit_read on public.mt_audit_events for select to authenticated using (public.mt_is_business_member(business_id));

-- No direct client insert/update/delete policies exist for posted accounting records.
-- Writes go through SECURITY DEFINER RPCs that validate role, ownership and balance.

create or replace function public.mt_create_business(p_name text,p_currency char(3) default 'ILS')
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 160 then raise exception 'Invalid business name'; end if;
 if p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid currency'; end if;
 insert into public.mt_businesses(name,currency,created_by) values(trim(p_name),p_currency,auth.uid()) returning id into v_id;
 insert into public.mt_business_members(business_id,user_id,role) values(v_id,auth.uid(),'owner');
 insert into public.mt_accounts(business_id,code,name,account_type) values
 (v_id,'1000','Cash and bank','asset'),(v_id,'1100','Accounts receivable','asset'),(v_id,'1200','Inventory','asset'),(v_id,'1500','Equipment','asset'),
 (v_id,'2000','Accounts payable','liability'),(v_id,'2100','VAT payable','liability'),(v_id,'2200','Loans payable','liability'),
 (v_id,'3000','Owner equity','equity'),(v_id,'4000','Sales revenue','income'),(v_id,'4100','Other income','income'),
 (v_id,'5000','Cost of goods sold','expense'),(v_id,'5100','Payroll expense','expense'),(v_id,'5200','Rent expense','expense'),
 (v_id,'5300','Marketing expense','expense'),(v_id,'5400','Utilities expense','expense'),(v_id,'5500','Other expense','expense');
 insert into public.mt_audit_events(business_id,actor_id,event_type,entity_type,entity_id)
 values(v_id,auth.uid(),'business.created','business',v_id);
 return v_id;
end $$;

create or replace function public.mt_post_journal_entry(
 p_business_id uuid,p_entry_date date,p_memo text,p_lines jsonb,p_source text default 'manual',p_reversal_of uuid default null
) returns uuid language plpgsql security definer set search_path=public
as $$
declare v_entry uuid; v_debits numeric(18,2); v_credits numeric(18,2); v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if public.mt_business_role(p_business_id) not in ('owner','admin','accountant','bookkeeper') then raise exception 'Insufficient business permission'; end if;
 if p_entry_date is null or length(trim(coalesce(p_memo,''))) not between 1 and 500 then raise exception 'Invalid journal date or memo'; end if;
 if p_source not in ('manual','invoice','bill','bank_import','payroll','inventory','adjustment','reversal') then raise exception 'Invalid journal source'; end if;
 if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines)<2 then raise exception 'At least two journal lines are required'; end if;
 select count(*),coalesce(sum((x->>'debit')::numeric),0),coalesce(sum((x->>'credit')::numeric),0)
 into v_count,v_debits,v_credits from jsonb_array_elements(p_lines) x;
 if exists(select 1 from jsonb_array_elements(p_lines) x where
   coalesce(x->>'account_id','')='' or
   coalesce((x->>'debit')::numeric,0)<0 or coalesce((x->>'credit')::numeric,0)<0 or
   (coalesce((x->>'debit')::numeric,0)>0 and coalesce((x->>'credit')::numeric,0)>0) or
   ((coalesce((x->>'debit')::numeric,0)=0)=(coalesce((x->>'credit')::numeric,0)=0))
 ) then raise exception 'Invalid journal line'; end if;
 if round(v_debits,2)<=0 or round(v_debits,2)<>round(v_credits,2) then raise exception 'Journal entry is not balanced'; end if;
 if exists(select 1 from jsonb_array_elements(p_lines) x left join public.mt_accounts a on a.id=(x->>'account_id')::uuid and a.business_id=p_business_id and a.is_active where a.id is null) then raise exception 'Account does not belong to this business or is inactive'; end if;
 if p_reversal_of is not null and not exists(select 1 from public.mt_journal_entries e where e.id=p_reversal_of and e.business_id=p_business_id) then raise exception 'Original journal entry not found'; end if;
 insert into public.mt_journal_entries(business_id,entry_date,memo,source,reversal_of,created_by)
 values(p_business_id,p_entry_date,trim(p_memo),p_source,p_reversal_of,auth.uid()) returning id into v_entry;
 insert into public.mt_journal_lines(business_id,journal_entry_id,account_id,description,debit,credit)
 select p_business_id,v_entry,(x->>'account_id')::uuid,nullif(x->>'description',''),coalesce((x->>'debit')::numeric,0),coalesce((x->>'credit')::numeric,0)
 from jsonb_array_elements(p_lines) x;
 insert into public.mt_audit_events(business_id,actor_id,event_type,entity_type,entity_id,details)
 values(p_business_id,auth.uid(),'journal.posted','journal_entry',v_entry,jsonb_build_object('source',p_source,'debits',round(v_debits,2),'credits',round(v_credits,2),'reversal_of',p_reversal_of));
 return v_entry;
end $$;

revoke all on function public.mt_create_business(text,char) from public;
revoke all on function public.mt_post_journal_entry(uuid,date,text,jsonb,text,uuid) from public;
grant execute on function public.mt_create_business(text,char) to authenticated;
grant execute on function public.mt_post_journal_entry(uuid,date,text,jsonb,text,uuid) to authenticated;
grant select on public.mt_businesses,public.mt_business_members,public.mt_accounts,public.mt_journal_entries,public.mt_journal_lines,public.mt_audit_events to authenticated;
