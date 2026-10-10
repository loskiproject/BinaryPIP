create table if not exists public.account_activities (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('account_created', 'profile_updated')),
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists account_activities_user_created_idx
  on public.account_activities (user_id, created_at desc);

alter table public.account_activities enable row level security;
grant select on public.account_activities to authenticated;

drop policy if exists "Users can read their own account activity" on public.account_activities;
create policy "Users can read their own account activity"
  on public.account_activities for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.account_activities (user_id, event_type, summary)
  values (new.id, 'account_created', 'Your account was created.');

  return new;
end;
$$;

create or replace function public.record_profile_name_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.full_name is distinct from old.full_name then
    insert into public.account_activities (user_id, event_type, summary)
    values (new.id, 'profile_updated', 'Your display name was updated.');
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_name_updated_record_activity on public.profiles;
create trigger on_profile_name_updated_record_activity
  after update of full_name on public.profiles
  for each row execute procedure public.record_profile_name_activity();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'account_activities'
  ) then
    alter publication supabase_realtime add table public.account_activities;
  end if;
end;
$$;