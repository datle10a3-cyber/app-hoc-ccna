-- CCNA Notes secure multi-device sync (run once in a NEW Supabase project's SQL Editor).
-- Uses separate account-scoped tables; the legacy public tables/policies are not used.

create table if not exists public.ccna_lessons (
  user_id uuid not null references auth.users(id),
  id text not null, title text not null, topic text not null, tags text[] not null default '{}',
  summary text not null default '', image_url text, blocks jsonb not null default '[]',
  related_command_ids text[] not null default '{}', topology_id text, is_favorite boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
create table if not exists public.ccna_cisco_commands (
  user_id uuid not null references auth.users(id),
  id text not null, command text not null, title text not null, description text not null default '',
  category text not null, device text not null, mode text not null, example text not null default '', notes text,
  image_url text, steps jsonb not null default '[]', tags text[] not null default '{}', is_favorite boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
create table if not exists public.ccna_topologies (
  user_id uuid not null references auth.users(id),
  id text not null, title text not null, description text not null default '', image_url text,
  nodes jsonb not null default '[]', links jsonb not null default '[]', devices text[] not null default '{}',
  ip_list jsonb not null default '[]', notes text, related_command_ids text[] not null default '{}',
  is_favorite boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
create table if not exists public.ccna_personal_notes (
  user_id uuid not null references auth.users(id),
  id text not null, title text not null, type text not null, content text not null, image_url text,
  tags text[] not null default '{}', is_favorite boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
create table if not exists public.ccna_user_images (
  user_id uuid not null references auth.users(id),
  id text not null, data_url text not null, updated_at timestamptz not null default now(), primary key (user_id,id)
);

alter table public.ccna_lessons enable row level security;
alter table public.ccna_cisco_commands enable row level security;
alter table public.ccna_topologies enable row level security;
alter table public.ccna_personal_notes enable row level security;
alter table public.ccna_user_images enable row level security;

-- Re-runnable policy reset; no anonymous access, and every row is isolated to auth.uid().
do $$
declare table_name text;
begin
  foreach table_name in array array['ccna_lessons','ccna_cisco_commands','ccna_topologies','ccna_personal_notes','ccna_user_images'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = 'account owns rows') then
      execute format('create policy "account owns rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', table_name);
    end if;
  end loop;
end $$;

grant select, insert, update, delete on public.ccna_lessons, public.ccna_cisco_commands,
  public.ccna_topologies, public.ccna_personal_notes, public.ccna_user_images to authenticated;
revoke all on public.ccna_lessons, public.ccna_cisco_commands, public.ccna_topologies,
  public.ccna_personal_notes, public.ccna_user_images from anon, public;

-- Enable live cross-device refreshes (the app also syncs on app focus/manual request).
do $$
declare table_name text;
begin
  foreach table_name in array array['ccna_lessons','ccna_cisco_commands','ccna_topologies','ccna_personal_notes','ccna_user_images'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

