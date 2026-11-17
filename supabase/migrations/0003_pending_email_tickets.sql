-- UruDesk Phase 1c: tickets from unknown senders wait for admin approval.
-- Apply AFTER 0002, by hand in the Supabase SQL editor, BEFORE deploying the code.
-- Additive only: makes client_id optional for pending tickets; no data changes.

-- A pending ticket has no client yet, only the sender's address.
alter table public.tickets alter column client_id drop not null;
alter table public.tickets add column if not exists pending_email text;
alter table public.tickets drop constraint if exists tickets_owner_check;
alter table public.tickets add constraint tickets_owner_check
  check (client_id is not null or pending_email is not null);

-- Clients only ever see client_id = auth.uid(), so a pending ticket
-- (client_id null) is visible to admins only. No RLS change needed.

-- Inbound log gets a 'pending' outcome.
alter table public.inbound_emails drop constraint if exists inbound_emails_status_check;
alter table public.inbound_emails add constraint inbound_emails_status_check
  check (status in ('processing', 'created', 'pending', 'held', 'ignored', 'failed'));
