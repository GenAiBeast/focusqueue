-- FocusQueue schema (No-login personal quick mode)
-- WARNING: The RLS policies below intentionally allow anon access.
-- This is suitable for personal quick usage only.

create extension if not exists pgcrypto;

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  type text not null default 'one_time' check (type in ('one_time', 'recurring')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'active' check (status in ('active', 'blocked', 'completed', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Safe migration for existing projects created before checkpoint type existed.
alter table public.checkpoints
  add column if not exists type text;

update public.checkpoints
set type = 'one_time'
where type is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'checkpoints_type_check'
  ) then
    alter table public.checkpoints
      add constraint checkpoints_type_check
      check (type in ('one_time', 'recurring'));
  end if;
end;
$$;

alter table public.checkpoints
  alter column type set default 'one_time';

alter table public.checkpoints
  alter column type set not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_experiments_updated_at on public.experiments;
create trigger set_experiments_updated_at
before update on public.experiments
for each row
execute function public.set_updated_at();

drop trigger if exists set_checkpoints_updated_at on public.checkpoints;
create trigger set_checkpoints_updated_at
before update on public.checkpoints
for each row
execute function public.set_updated_at();

create index if not exists idx_checkpoints_experiment_id
  on public.checkpoints (experiment_id);

create index if not exists idx_checkpoints_created_at
  on public.checkpoints (created_at desc);

create index if not exists idx_checkpoints_experiment_order
  on public.checkpoints (experiment_id, sort_order, created_at desc);

alter table public.experiments enable row level security;
alter table public.checkpoints enable row level security;

drop policy if exists "personal_experiments_all_access" on public.experiments;
create policy "personal_experiments_all_access"
  on public.experiments
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "personal_checkpoints_all_access" on public.checkpoints;
create policy "personal_checkpoints_all_access"
  on public.checkpoints
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant all on table public.experiments to anon, authenticated;
grant all on table public.checkpoints to anon, authenticated;
