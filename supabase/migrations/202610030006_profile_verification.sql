alter table public.profiles
  add column if not exists recovery_email text not null default '',
  add column if not exists home_address text not null default '',
  add column if not exists document_region text not null default 'Global',
  add column if not exists document_type text not null default 'ID Card',
  add column if not exists document_number text not null default '';

create table if not exists public.profile_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  document_type text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'application/pdf')),
  file_size bigint not null check (file_size > 0 and file_size <= 5242880),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  submitted_at timestamptz not null default now()
);

create index if not exists profile_documents_user_submitted_idx
  on public.profile_documents (user_id, submitted_at desc);

alter table public.profile_documents enable row level security;
grant select, insert on public.profile_documents to authenticated;

drop policy if exists "Users and admins can read profile documents" on public.profile_documents;
create policy "Users and admins can read profile documents"
  on public.profile_documents for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Users can submit their own profile documents" on public.profile_documents;
create policy "Users can submit their own profile documents"
  on public.profile_documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Only admins can update profile document status" on public.profile_documents;
create policy "Only admins can update profile document status"
  on public.profile_documents for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create table if not exists public.profile_suitability_responses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  primary_goal text not null,
  income_band text not null,
  derivative_experience text not null,
  risk_percentage integer not null check (risk_percentage between 0 and 100),
  referral_source text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_suitability_responses enable row level security;
grant select, insert, update on public.profile_suitability_responses to authenticated;

drop policy if exists "Users can read their own suitability response" on public.profile_suitability_responses;
create policy "Users can read their own suitability response"
  on public.profile_suitability_responses for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save their own suitability response" on public.profile_suitability_responses;
create policy "Users can save their own suitability response"
  on public.profile_suitability_responses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own suitability response" on public.profile_suitability_responses;
create policy "Users can update their own suitability response"
  on public.profile_suitability_responses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880,
  array['image/jpeg', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'application/pdf'];

drop policy if exists "Users can read their own KYC documents" on storage.objects;
create policy "Users can read their own KYC documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own KYC documents" on storage.objects;
create policy "Users can upload their own KYC documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );