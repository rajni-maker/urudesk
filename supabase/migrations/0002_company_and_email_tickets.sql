-- UruDesk Phase 1b: company name on profiles + email-to-ticket.
-- Additive only (no drops, no data rewrites). Apply by hand in the Supabase SQL editor.

-- ---- Company name (free text for now; organisations come later) -----------
alter table public.profiles add column if not exists company_name text not null default '';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    left(coalesce(new.raw_user_meta_data ->> 'company_name', ''), 200)
  );
  return new;
end;
$$;

-- ---- Where a ticket came from ---------------------------------------------
alter table public.tickets add column if not exists source text not null default 'portal'
  check (source in ('portal', 'email'));

-- ---- Inbound email log ------------------------------------------------------
-- One row per Resend email. The unique key makes webhook retries no-ops,
-- so the same email can never create two tickets.
create table if not exists public.inbound_emails (
  id              uuid primary key default gen_random_uuid(),
  resend_email_id text not null unique,
  from_email      text not null default '',
  subject         text not null default '',
  status          text not null default 'processing'
                  check (status in ('processing', 'created', 'held', 'ignored', 'failed')),
  reason          text,
  ticket_id       uuid references public.tickets (id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.inbound_emails enable row level security;
-- Written only by the server (service role). Admins may read it for review.
grant select on public.inbound_emails to authenticated;
grant all on public.inbound_emails to service_role;
create policy inbound_emails_select on public.inbound_emails for select to authenticated
  using (public.is_admin());
