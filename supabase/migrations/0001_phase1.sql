-- PixelSupport Phase 1 — whole schema. Apply once, by hand, in the NEW project's SQL editor.

-- ---------- Tables ----------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

create table public.tickets (
  id          uuid primary key default gen_random_uuid(),
  number      serial unique,
  subject     text not null check (length(trim(subject)) > 0),
  body        text not null,
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  priority    text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  client_id   uuid not null references public.profiles (id) on delete cascade,
  assignee_id uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tickets_client_id_idx on public.tickets (client_id);
create index tickets_status_idx on public.tickets (status);

create table public.ticket_replies (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index ticket_replies_ticket_id_idx on public.ticket_replies (ticket_id);

create table public.ticket_events (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets (id) on delete cascade,
  actor_id   uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('status', 'assign')),
  from_value text,
  to_value   text,
  created_at timestamptz not null default now()
);
create index ticket_events_ticket_id_idx on public.ticket_events (ticket_id);

-- ---------- Functions + triggers -------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- Every new auth user gets a client profile. Admins are made by the invite
-- server action (service role) or by hand in SQL — never by signup metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_touch_updated_at
  before update on public.tickets
  for each row execute function public.touch_updated_at();

-- ---------- Grants ----------------------------------------------------------

revoke all on public.profiles, public.tickets, public.ticket_replies, public.ticket_events from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;  -- role is never client-writable
grant select, update, delete on public.tickets to authenticated;
-- Insert is column-level so clients can't set number/created_at/updated_at.
grant insert (subject, body, priority, client_id, assignee_id, status) on public.tickets to authenticated;
grant select on public.ticket_replies, public.ticket_events to authenticated;
grant insert (ticket_id, author_id, body) on public.ticket_replies to authenticated;
grant insert (ticket_id, actor_id, kind, from_value, to_value) on public.ticket_events to authenticated;
grant usage, select on sequence public.tickets_number_seq to authenticated;

-- Server-only admin client (team invites). Newer Supabase projects don't grant this by default.
grant all on public.profiles, public.tickets, public.ticket_replies, public.ticket_events to service_role;
grant usage, select on sequence public.tickets_number_seq to service_role;

-- ---------- RLS -------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.tickets        enable row level security;
alter table public.ticket_replies enable row level security;
alter table public.ticket_events  enable row level security;

-- profiles: own row, every admin row (so clients see who replied), admins see all.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or role = 'admin' or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- tickets: clients read/insert their own (open, unassigned); admins do everything.
create policy tickets_select on public.tickets for select to authenticated
  using (client_id = auth.uid() or public.is_admin());
create policy tickets_insert on public.tickets for insert to authenticated
  with check (
    public.is_admin()
    or (client_id = auth.uid() and status = 'open' and assignee_id is null)
  );
create policy tickets_update on public.tickets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tickets_delete on public.tickets for delete to authenticated
  using (public.is_admin());

-- replies: anyone who can see the ticket can read and post, as themselves.
create policy replies_select on public.ticket_replies for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_id and t.client_id = auth.uid())
  );
create policy replies_insert on public.ticket_replies for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from public.tickets t where t.id = ticket_id and t.client_id = auth.uid())
    )
  );

-- events: clients read their tickets' log; only admins write it.
create policy events_select on public.ticket_events for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_id and t.client_id = auth.uid())
  );
create policy events_insert on public.ticket_events for insert to authenticated
  with check (actor_id = auth.uid() and public.is_admin());
