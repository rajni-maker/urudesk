# PixelSupport Phase 1 — Design

Date: 2026-11-04 · Branch: `phase1` · Target: 2 days

## Goal

A simple helpdesk for one internal support team. Two roles: **Internal Admin** and **Client**.
No AI, no agencies, no multi-tenancy. v1 (last commit `23cf3ef` on `main`) is reference only.

## Approach

- New branch `phase1`, rebuilt from v1 by deletion + trimming.
- **New Supabase project** with one migration `supabase/migrations/0001_phase1.sql`.
  v1's production DB is never modified. Cut-over = swap Vercel env vars when Phase 1 is approved.
- Old migrations `0001`–`0008` are deleted from the branch (they remain in `main`'s history).

## Kept from v1 (trimmed)

| File | Change |
|------|--------|
| `lib/supabase/*` | as is |
| `proxy.ts` | route guards reduced to: signed-out → `/login`; client hitting admin pages → `/tickets` |
| `lib/email.ts` | keep transport; templates for the 3 Phase 1 emails only |
| `lib/slack.ts` | keep `slackNewTicket` (drop company field) and `slackTicketAssigned`; delete `slackCustomerReply` |
| `app/login`, `app/signup`, `app/forgot-password`, `app/reset-password`, `app/auth` | as is, signup always creates a client |

## Parked for Phase 2 (kept, not wired)

`lib/ai.ts` and the `@anthropic-ai/sdk` dependency stay in the repo untouched. Nothing in Phase 1 imports them;
the v1 AI columns are not in the new schema. Phase 2 re-wires triage/drafts on top of the Phase 1 tables.

## Removed

`app/companies`, `app/contacts`, landing page (`/` redirects to `/tickets`), client portal,
agency logic in `lib/roles.ts`, root-level `*.html` mockups.

## Data model (`0001_phase1.sql`)

```
profiles        id (= auth.users.id) PK, email, full_name, role ('admin'|'client') default 'client', created_at
tickets         id uuid PK, number serial unique, subject, body,
                status ('open'|'in_progress'|'resolved') default 'open',
                priority ('low'|'normal'|'high') default 'normal',
                client_id → profiles, assignee_id → profiles null, created_at, updated_at
ticket_replies  id, ticket_id → tickets (cascade), author_id → profiles, body, created_at
ticket_events   id, ticket_id → tickets (cascade), actor_id → profiles, kind ('status'|'assign'), from_value, to_value, created_at
```

- Trigger on `auth.users` insert creates a `profiles` row, always with role `'client'`.
  Admins are made only by the invite server action (service role) or by hand in SQL — see Invites.
- `ticket_events` for `assign` store display names (not ids) in `from_value` / `to_value`.
- `is_admin()` SQL function (`security definer`): `select role = 'admin' from profiles where id = auth.uid()`.
- Assigning a ticket whose status is `open` sets it to `in_progress` (done in the server action, logged as an event).

## RLS

| Table | Client | Admin |
|-------|--------|-------|
| profiles | select own row + all admin rows (so the thread shows who replied); update own `full_name` only | select all, update all |
| tickets | select/insert where `client_id = auth.uid()`; no update | all |
| ticket_replies | select/insert on own tickets, `author_id = auth.uid()` | all |
| ticket_events | select on own tickets | all |

Clients cannot change status, priority after creation, or assignee. Role column is not client-writable
(revoke update on `profiles.role` from `authenticated`; admins change roles via server action using the service role).

## Invites

- `/team` (admin only): form with email + role (admin|client). Server action calls
  `supabase.auth.admin.inviteUserByEmail(email, { data: { role } })` with the service-role key, then,
  for admin invites, sets `profiles.role = 'admin'` with the same client. (Supabase inserts the user before
  setting `invited_at`, so the trigger can't tell an invite from a signup.) Public signups cannot self-promote.
- Invite links go to `/auth/confirm?token_hash=…&type=invite&next=/reset-password` (custom "Invite user"
  email template in the Supabase dashboard); the route verifies the token and the invitee sets a password.
- First admin: run `update profiles set role = 'admin' where email = '…';` in the SQL editor.

## Pages

| Route | Who | Content |
|-------|-----|---------|
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | public | v1 auth |
| `/tickets` | both | list; client sees own, admin sees all; filters by status + priority via search params |
| `/tickets/new` | both | subject, body, priority (admin can also pick client) |
| `/tickets/[id]` | both | ticket, reply thread, event log; admin controls: status, priority, assignee |
| `/dashboard` | admin | counts per status + one bar chart (tickets per status), plain SVG/CSS, no chart lib |
| `/team` | admin | member list (name, email, role) + invite form |

Top nav shows Dashboard/Team only to admins.

## Notifications

All best-effort: failures are logged, never fail the action. No-op when env var unset.

| Event | Slack | Email |
|-------|-------|-------|
| Ticket created | `slackNewTicket` | all admins |
| Ticket assigned | `slackTicketAssigned` | — |
| Admin replies | — | ticket's client |
| Status changed | — | ticket's client |

Tagging teammates to troubleshoot happens natively in Slack: admins thread on the alert and @-mention.
No Slack app / bot token in Phase 1.

## Env vars

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (invites only),
`NEXT_PUBLIC_SITE_URL`, `SLACK_WEBHOOK_URL`, plus v1's existing email vars.

## Testing

- `npm run build` + `npm run lint` clean.
- Manual pass in the app (user-tested before any commit/merge): client signup → create ticket → admin sees it,
  Slack + email fire → admin assigns (status → In Progress) → admin replies (client email) → resolve.
- RLS check: second client cannot read the first client's ticket by URL.

## Out of scope (Phase 2)

AI triage/drafts, agencies/multi-tenancy, companies/contacts, Slack app with in-Slack actions,
@-mention pings tied to profiles, landing page, attachments.
