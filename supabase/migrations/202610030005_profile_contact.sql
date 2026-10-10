alter table public.profiles
  add column if not exists country text not null default '',
  add column if not exists phone text not null default '';

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'country', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;