-- UruDesk: rich-text ticket descriptions + ticket attachments.
-- Additive only (no drops, no data rewrites). Apply by hand in the Supabase
-- SQL editor, BEFORE deploying the code that uses it.

-- ---------------------------------------------------------------- Rich text
-- `body` stays the plain-text version (emails, Slack, inbound mail, search).
-- `body_html` is the formatted version from the editor, sanitized server-side
-- on write and again on render. Null for older and emailed tickets.
alter table public.tickets add column if not exists body_html text
  check (body_html is null or length(body_html) <= 50000);
grant insert (body_html) on public.tickets to authenticated;

-- Same for replies in the conversation thread.
alter table public.ticket_replies add column if not exists body_html text
  check (body_html is null or length(body_html) <= 50000);
grant insert (body_html) on public.ticket_replies to authenticated;

-- -------------------------------------------------------------- Attachments
create table if not exists public.ticket_attachments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets (id) on delete cascade,
  uploaded_by  uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  file_name    text not null check (length(file_name) between 1 and 255),
  mime_type    text not null,
  size_bytes   integer not null check (size_bytes > 0),
  created_at   timestamptz not null default now()
);
create index if not exists ticket_attachments_ticket_id_idx on public.ticket_attachments (ticket_id);

alter table public.ticket_attachments enable row level security;

-- Readable by whoever can read the ticket: its client, or an admin.
-- Rows are only ever written by the server (service role) after it has
-- checked the file's real content type, so there is no insert grant.
grant select on public.ticket_attachments to authenticated;
grant all on public.ticket_attachments to service_role;

create policy attachments_select on public.ticket_attachments for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.tickets t where t.id = ticket_id and t.client_id = auth.uid())
  );

-- Private bucket. No storage.objects policies for `authenticated` on purpose:
-- uploads go through short-lived signed upload URLs the server issues, and
-- downloads through short-lived signed URLs issued after the RLS check above.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments', 'ticket-attachments', false, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip', 'text/plain', 'text/csv'
  ]
)
on conflict (id) do nothing;
