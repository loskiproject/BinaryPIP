create table if not exists public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	full_name text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
	on public.profiles for select
	to authenticated
	using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
	on public.profiles for update
	to authenticated
	using ((select auth.uid()) = id)
	with check ((select auth.uid()) = id);

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
	return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
	after insert on auth.users
	for each row execute procedure public.create_profile_for_new_user();

do $$
begin
	if not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'profiles'
	) then
		alter publication supabase_realtime add table public.profiles;
	end if;
end;
$$;
