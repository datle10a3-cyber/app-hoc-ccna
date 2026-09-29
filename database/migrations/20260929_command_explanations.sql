-- Add account-scoped AI/manual Cisco command explanations to an existing Supabase project.
-- Safe to run more than once in the Supabase SQL editor.
create table if not exists public.ccna_command_explanations (
  user_id uuid not null references auth.users(id),
  command_pattern text not null,
  explanation text not null,
  category text not null default 'Cisco IOS',
  config_mode text not null default 'Không xác định',
  related_commands text[] not null default '{}',
  user_edited boolean not null default false,
  confidence real,
  updated_at timestamptz not null default now(),
  primary key (user_id, command_pattern)
);

alter table public.ccna_command_explanations enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ccna_command_explanations' and policyname = 'account owns rows'
  ) then
    create policy "account owns rows" on public.ccna_command_explanations
      for all to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end $$;

grant select, insert, update, delete on public.ccna_command_explanations to authenticated;
revoke all on public.ccna_command_explanations from anon, public;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ccna_command_explanations'
    ) then
    alter publication supabase_realtime add table public.ccna_command_explanations;
  end if;
end $$;
