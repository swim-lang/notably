create table if not exists public.notably_newsletter_signups (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  source_path text not null default '/',
  user_agent text,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now()
);

alter table public.notably_newsletter_signups enable row level security;

drop policy if exists "allow anonymous notably newsletter insert"
  on public.notably_newsletter_signups;

create policy "allow anonymous notably newsletter insert"
  on public.notably_newsletter_signups
  for insert
  to anon
  with check (status = 'subscribed');
