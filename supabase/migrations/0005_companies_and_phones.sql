-- UruDesk: companies (grouped by work email domain), shared company tickets,
-- and personal phone numbers.
-- Additive: new table + new nullable/defaulted columns, existing rows backfilled.
-- Apply by hand in the Supabase SQL editor BEFORE deploying the code that uses it.

-- ---- Companies ---------------------------------------------------------------
-- `domain` is set for work domains (acme.com) so later signups can join.
-- Free-mail users (gmail.com, ...) get a company of their own with domain null.
create table if not exists public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 1 and 200),
  domain     text unique,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists company_id uuid references public.companies (id) on delete set null;
alter table public.profiles add column if not exists phone  text not null default '' check (length(phone)  <= 30);
alter table public.profiles add column if not exists phone2 text not null default '' check (length(phone2) <= 30);
create index if not exists profiles_company_id_idx on public.profiles (company_id);

alter table public.tickets add column if not exists company_id uuid references public.companies (id) on delete set null;
create index if not exists tickets_company_id_idx on public.tickets (company_id);

-- ---- Helpers -------------------------------------------------------------------
create or replace function public.is_free_email_domain(d text) returns boolean
language sql immutable as $$
  select lower(d) = any (array[
    'gmail.com','googlemail.com','outlook.com','hotmail.com','hotmail.co.uk','live.com','msn.com',
    'yahoo.com','yahoo.co.in','yahoo.co.uk','yahoo.in','ymail.com','rocketmail.com',
    'icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com','pm.me',
    'zoho.com','zohomail.com','rediffmail.com','gmx.com','gmx.net','mail.com','yandex.com',
    'fastmail.com','hey.com','tutanota.com','duck.com'
  ]);
$$;

-- Finds the company for an email address, creating it if needed.
-- Work domain: join the existing company for that domain, or create it.
-- Free-mail or no domain: always a new, unshared company.
create or replace function public.company_for(p_email text, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d    text := lower(nullif(split_part(coalesce(p_email, ''), '@', 2), ''));
  nm   text := left(coalesce(nullif(trim(p_name), ''), d, coalesce(p_email, 'Company')), 200);
  cid  uuid;
begin
  if d is null or public.is_free_email_domain(d) then
    insert into public.companies (name) values (nm) returning id into cid;
    return cid;
  end if;
  -- on conflict keeps two simultaneous signups from creating two companies.
  insert into public.companies (name, domain) values (nm, d)
    on conflict (domain) do nothing returning id into cid;
  if cid is null then
    select id into cid from public.companies where domain = d;
  end if;
  return cid;
end;
$$;
revoke all on function public.company_for(text, text) from public, anon, authenticated;

create or replace function public.my_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- ---- Signup trigger: phones + company ---------------------------------------
-- Staff invited from /team (metadata role 'admin') don't get a company. A client
-- faking that metadata only loses their company; their role stays 'client'.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, company_name, phone, phone2, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    left(coalesce(new.raw_user_meta_data ->> 'company_name', ''), 200),
    left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30),
    left(coalesce(new.raw_user_meta_data ->> 'phone2', ''), 30),
    case when coalesce(new.raw_user_meta_data ->> 'role', '') <> 'admin'
      then public.company_for(new.email, new.raw_user_meta_data ->> 'company_name')
    end
  );
  return new;
end;
$$;

-- ---- Tickets carry their client's company ------------------------------------
-- Set on insert and whenever client_id changes (e.g. a pending email ticket approved).
create or replace function public.set_ticket_company() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.company_id := (select company_id from public.profiles where id = new.client_id);
  return new;
end;
$$;
drop trigger if exists tickets_set_company on public.tickets;
create trigger tickets_set_company
  before insert or update of client_id on public.tickets
  for each row execute function public.set_ticket_company();

-- ---- Backfill existing clients and tickets ----------------------------------
do $$
declare r record;
begin
  for r in select id, email, company_name from public.profiles
           where company_id is null and role = 'client' order by created_at
  loop
    update public.profiles set company_id = public.company_for(r.email, r.company_name) where id = r.id;
  end loop;
end $$;

update public.tickets t set company_id = p.company_id
  from public.profiles p where p.id = t.client_id and t.company_id is null;

-- ---- Grants --------------------------------------------------------------------
grant select on public.companies to authenticated;
grant update (name) on public.companies to authenticated;
grant all on public.companies to service_role;
-- Users may edit their own phones (alongside full_name); never company_id or role.
grant update (phone, phone2) on public.profiles to authenticated;

-- ---- RLS -----------------------------------------------------------------------
alter table public.companies enable row level security;
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated
  using (public.is_admin() or id = public.my_company_id());
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Colleagues can see each other (names on shared tickets, the members list).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid() or role = 'admin' or public.is_admin()
    or (company_id is not null and company_id = public.my_company_id())
  );

-- A ticket is visible to everyone in its company.
drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets for select to authenticated
  using (
    client_id = auth.uid() or public.is_admin()
    or (company_id is not null and company_id = public.my_company_id())
  );

drop policy if exists replies_select on public.ticket_replies;
create policy replies_select on public.ticket_replies for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_id
               and (t.client_id = auth.uid() or (t.company_id is not null and t.company_id = public.my_company_id())))
  );

drop policy if exists replies_insert on public.ticket_replies;
create policy replies_insert on public.ticket_replies for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from public.tickets t where t.id = ticket_id
                 and (t.client_id = auth.uid() or (t.company_id is not null and t.company_id = public.my_company_id())))
    )
  );

drop policy if exists events_select on public.ticket_events;
create policy events_select on public.ticket_events for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_id
               and (t.client_id = auth.uid() or (t.company_id is not null and t.company_id = public.my_company_id())))
  );

drop policy if exists attachments_select on public.ticket_attachments;
create policy attachments_select on public.ticket_attachments for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_id
               and (t.client_id = auth.uid() or (t.company_id is not null and t.company_id = public.my_company_id())))
  );
