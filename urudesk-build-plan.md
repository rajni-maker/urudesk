# UruDesk — Build Plan & Master Prompt
**Target ship date: July 23rd (4 build days from today, July 19)**

---

## 1. Product Positioning

**UruDesk** is a lightweight, AI-assisted helpdesk for agencies and small businesses — not a Freshdesk clone. The wedge:

- **Fast, modern UI** — no bloat, no 15-year-old UX debt
- **AI does the boring parts** — triage, drafting, summarizing, tagging — humans approve everything
- **Built SaaS-first** — multi-tenant from day one, even if you only onboard yourself and 1-2 clients initially
- **Three roles**: Admin (you), Support Agent, Client

Core promise to a small agency owner: *"Stop babysitting tickets. Let AI sort and draft, you just approve and send."*

---

## 2. Tech Stack (free-tier, matches your existing setup)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + API routes in one repo, Vercel-native |
| Hosting | Vercel | Free tier, zero-config deploys from GitHub |
| Database + Auth | Supabase (Postgres) | Free tier, built-in auth, row-level security = multi-tenant done right |
| Email | Resend | Free tier, clean API, good deliverability |
| AI | Anthropic API (Claude) | Ticket triage, reply drafting, summarization |
| Styling | Tailwind CSS + shadcn/ui | Fast, modern, consistent components |
| Dev tool | Cursor AI | Your existing AI-assisted coding workflow |
| Repo | GitHub | Version control + Vercel CI/CD trigger |

**Total monthly cost at MVP scale: $0** (Supabase, Vercel, Resend free tiers cover this comfortably; Claude API usage is pay-as-you-go pennies at low ticket volume).

---

## 3. Multi-Tenant Architecture (the SaaS-from-day-one part)

Even though you're the only "org" at launch, build it so a second business can sign up without a rewrite:

- Every core table has an `organization_id` column
- Supabase **Row Level Security (RLS)** policies scope every query to the logged-in user's `organization_id`
- Auth: Supabase Auth handles signup/login; a `profiles` table maps `user_id → organization_id + role`
- One codebase, one database, tenant isolation via RLS — not separate databases per client (keeps it free-tier friendly and simple to maintain)

This one decision (RLS-based multi-tenancy) is the single most important architectural choice — get it right on day 1 and everything else is easy.

---

## 4. Data Model (MVP)

```
organizations
  id, name, created_at, plan (free/pro — for future billing)

profiles
  id (= auth.users.id), organization_id, role (admin/agent/client), full_name, email

tickets
  id, organization_id, client_id, assigned_agent_id,
  subject, description, status, priority,
  ai_summary, ai_suggested_tags, category,
  created_at, updated_at

ticket_messages
  id, ticket_id, sender_id, sender_role, body,
  is_ai_drafted (bool), created_at

ticket_status_history
  id, ticket_id, old_status, new_status, changed_by, changed_at
```

**Status workflow** (per your earlier notes):
`Open → In Progress → Waiting on Client → Testing → Resolved → Closed`

---

## 5. Roles & Permissions

| Role | Can do |
|---|---|
| **Admin** | Everything: manage org, invite agents, view all tickets, assign agents, view analytics |
| **Agent** | View/respond to assigned + unassigned tickets, use AI drafts, update status |
| **Client** | Submit tickets, view their own ticket history, reply, cannot see internal notes |

---

## 6. Core Features — MVP Scope (what actually ships by the 23rd)

**Must-have (build these):**
1. Auth + org signup/login (Supabase Auth)
2. Ticket creation (client-facing form + agent-facing manual entry)
3. Ticket list + detail view, filterable by status/priority
4. Threaded replies on a ticket (client ↔ agent)
5. **AI ticket triage**: on new ticket creation, Claude auto-generates a summary, suggests a category/tag, and suggests a priority — agent reviews/accepts with one click
6. **AI reply drafting**: agent clicks "Draft with AI," gets a suggested reply based on ticket context, edits before sending — human always sends, never auto-sends
7. Status change workflow with history log
8. Email notifications via Resend (new ticket, new reply, status change)
9. Basic role-based dashboards (Admin/Agent/Client see different views)

**Explicitly cut from MVP (v2 backlog):**
- Billing/subscriptions (Stripe) — stub the `plan` field now, wire up later
- SLA timers, canned responses, knowledge base, satisfaction surveys, mobile app wrapper
- Multi-language support

Cutting these is what makes the 23rd realistic. Resist scope creep this week.

---

## 7. Day-by-Day Plan (July 19 → 23)

**Day 1 (Sun, Jul 19) — Foundation**
- Set up GitHub repo, Next.js project, Tailwind + shadcn/ui
- Set up Supabase project: schema above, RLS policies, Auth config
- Deploy empty shell to Vercel — confirm the pipeline works end to end *before* building features

**Day 2 (Mon, Jul 20) — Core ticketing**
- Auth flows (signup, login, org creation, role assignment)
- Ticket CRUD: create, list, detail view
- Threaded replies

**Day 3 (Tue, Jul 21) — AI + notifications**
- Wire Claude API: triage on ticket creation, AI-drafted reply suggestion
- Resend email notifications (new ticket, reply, status change)
- Status workflow + history logging

**Day 4 (Wed, Jul 22) — Polish + dashboards**
- Role-based dashboard views (Admin/Agent/Client)
- Empty states, loading states, mobile-responsive pass
- Bug bash, seed demo data, test all three roles end-to-end

**Day 5 (Thu, Jul 23) — Ship**
- Final QA pass, fix blockers only (no new features)
- Deploy to production Vercel URL
- Write a short demo script / walkthrough if this needs to be presented

---

## 8. Master Prompt (paste this into Cursor AI to scaffold the project)

```
You are helping me build UruDesk, a multi-tenant SaaS helpdesk application.

TECH STACK:
- Next.js 14 (App Router, TypeScript)
- Supabase (Postgres, Auth, Row Level Security)
- Tailwind CSS + shadcn/ui components
- Resend for transactional email
- Anthropic Claude API for AI features
- Deployed on Vercel

ARCHITECTURE REQUIREMENTS:
- Multi-tenant from day one: every core table has an organization_id column
- Use Supabase Row Level Security policies so users only ever see rows belonging
  to their own organization_id — enforce this at the database layer, not just
  in application code
- Three roles: admin, agent, client — stored in a profiles table linked to
  Supabase auth.users
- Clean, modern, minimal UI — not a dense enterprise dashboard. Prioritize
  whitespace, clear hierarchy, fast perceived load times

DATA MODEL:
- organizations(id, name, created_at, plan)
- profiles(id, organization_id, role, full_name, email)
- tickets(id, organization_id, client_id, assigned_agent_id, subject,
  description, status, priority, ai_summary, ai_suggested_tags, category,
  created_at, updated_at)
- ticket_messages(id, ticket_id, sender_id, sender_role, body, is_ai_drafted,
  created_at)
- ticket_status_history(id, ticket_id, old_status, new_status, changed_by,
  changed_at)

Ticket status flow: Open -> In Progress -> Waiting on Client -> Testing ->
Resolved -> Closed

CORE FEATURES TO BUILD, IN THIS ORDER:
1. Project scaffold: Next.js + Tailwind + shadcn/ui, connected to Supabase,
   deployable to Vercel with one command
2. Supabase schema + RLS policies for the tables above
3. Auth: signup creates a new organization + admin profile; invited users
   join an existing organization as agent or client
4. Ticket creation form (client-facing) and manual creation (agent-facing)
5. Ticket list view with filters by status and priority, scoped to the
   logged-in user's organization and role
6. Ticket detail view with a threaded message timeline
7. AI triage: on ticket creation, call the Claude API server-side to generate
   a short summary, a suggested category, and a suggested priority. Show
   these as editable suggestions the agent must confirm — never auto-apply
   without human confirmation
8. AI-assisted reply drafting: an agent can click "Draft with AI" on a ticket
   to get a suggested reply based on the ticket thread, which loads into the
   reply textbox for editing before sending. The AI never sends a message
   directly
9. Status change UI that logs every transition to ticket_status_history
10. Resend email notifications for: new ticket created, new reply added,
    status changed. Emails should be clean, minimal HTML templates
11. Role-based dashboard: Admin sees org-wide ticket stats and team list,
    Agent sees their assigned + unassigned tickets, Client sees only their
    own tickets

IMPORTANT CONSTRAINTS:
- Keep everything on free tiers (Supabase free, Vercel free, Resend free) —
  do not introduce services that require a paid plan
- AI must always be "human in the loop" — every AI suggestion is a draft that
  a human reviews and approves, never auto-sent or auto-applied
- I have limited hands-on coding experience, so after generating code, briefly
  explain in plain English what each new file does before moving to the next
  step
- Build and verify one feature at a time — don't generate the entire app in
  one pass. Confirm each piece works before moving to the next

Start with step 1: scaffold the Next.js project connected to Supabase and get
a blank deploy working on Vercel. Walk me through the Supabase project setup
and environment variables I need to configure first.
```

---

## 9. What to prepare before Day 1

- [ ] Create a Supabase project (free tier), grab the URL + anon key
- [ ] Create a Resend account (free tier), verify a sending domain or use their test domain
- [ ] Get an Anthropic API key for the Claude calls
- [ ] New GitHub repo, connected to a new Vercel project

---

## 10. Naming note

This plan uses the name **UruDesk** for the product but keeps the same core scope as the "Client Care Portal" concept you'd outlined earlier (tickets, client communication, maintenance-style workflow). If UruDesk is meant to be broader (agencies/small businesses generally, not just your own client base), the schema above already supports that — `organizations` being a first-class multi-tenant table means any agency can sign up and use it standalone.
