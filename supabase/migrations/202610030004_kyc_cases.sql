create table if not exists public.kyc_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  provider_case_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'needs_more_info')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id),
  reviewer_note text not null default '',
  unique (provider, provider_case_id)
);

create index if not exists kyc_cases_created_idx
  on public.kyc_cases (status, submitted_at desc);

alter table public.kyc_cases enable row level security;
grant select, update on public.kyc_cases to authenticated;

drop policy if exists "Users and admins can read KYC case metadata" on public.kyc_cases;
create policy "Users and admins can read KYC case metadata"
  on public.kyc_cases for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Only admins can update KYC case decisions" on public.kyc_cases;
create policy "Only admins can update KYC case decisions"
  on public.kyc_cases for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'kyc_cases'
  ) then
    alter publication supabase_realtime add table public.kyc_cases;
  end if;
end;
$$;