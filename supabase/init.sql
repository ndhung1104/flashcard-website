-- Supabase initial bootstrap for Flashcards app
-- Run once in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists decks_id_user_id_key on public.decks (id, user_id);
create index if not exists decks_user_id_created_at_idx on public.decks (user_id, created_at desc);

create table if not exists public.cards (
  id text primary key default gen_random_uuid()::text,
  deck_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  meaning text not null,
  tags text[] not null default '{}',
  is_unfamiliar boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_deck_fk foreign key (deck_id, user_id)
    references public.decks (id, user_id) on delete cascade
);

create index if not exists cards_user_id_deck_id_idx on public.cards (user_id, deck_id, created_at);
create index if not exists cards_user_id_unfamiliar_idx on public.cards (user_id, is_unfamiliar);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_decks_updated_at on public.decks;
create trigger set_decks_updated_at
before update on public.decks
for each row
execute function public.set_updated_at();

drop trigger if exists set_cards_updated_at on public.cards;
create trigger set_cards_updated_at
before update on public.cards
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id)
  do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists decks_select_own on public.decks;
create policy decks_select_own
on public.decks
for select
using (auth.uid() = user_id);

drop policy if exists decks_insert_own on public.decks;
create policy decks_insert_own
on public.decks
for insert
with check (auth.uid() = user_id);

drop policy if exists decks_update_own on public.decks;
create policy decks_update_own
on public.decks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists decks_delete_own on public.decks;
create policy decks_delete_own
on public.decks
for delete
using (auth.uid() = user_id);

drop policy if exists cards_select_own on public.cards;
create policy cards_select_own
on public.cards
for select
using (auth.uid() = user_id);

drop policy if exists cards_insert_own on public.cards;
create policy cards_insert_own
on public.cards
for insert
with check (auth.uid() = user_id);

drop policy if exists cards_update_own on public.cards;
create policy cards_update_own
on public.cards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists cards_delete_own on public.cards;
create policy cards_delete_own
on public.cards
for delete
using (auth.uid() = user_id);
