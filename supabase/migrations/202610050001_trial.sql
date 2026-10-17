-- Trial storage: one versioned document. All access is through the Edge Function.
-- The single row simplifies migration from the archive. Split into relational
-- tables before substantially increasing traffic or the question bank.
create table public.fso_state (
  id integer primary key check (id = 1),
  version bigint not null default 0,
  data jsonb not null
);
alter table public.fso_state enable row level security;
revoke all on public.fso_state from anon, authenticated;
grant select, update, insert on public.fso_state to service_role;

create or replace function public.fso_commit(expected_version bigint, new_data jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  update public.fso_state set data = new_data, version = version + 1
  where id = 1 and version = expected_version;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.fso_commit(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.fso_commit(bigint,jsonb) to service_role;
