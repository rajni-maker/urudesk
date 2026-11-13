import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/dashboard/AppShell";
import { requireProfile, displayName } from "@/lib/session";
import { roleLabel } from "@/lib/roles";
import {
  formatDateTime,
  isStatus,
  STATUS_OPTIONS,
  STATUS_LABELS,
  DARK_STATUS_STYLES,
  PRIORITY_OPTIONS,
  PRIORITY_LABELS,
  DARK_PRIORITY_STYLES,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/tickets";
import { addReply, assignTicket, changePriority, changeStatus } from "../actions";

type Person = { id: string; full_name: string; email: string; role: string } | null;
type Ticket = {
  id: string;
  number: number;
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  assignee_id: string | null;
  client: Person;
  assignee: Person;
};
type Reply = { id: string; body: string; created_at: string; author: Person };
type Event = {
  id: string;
  kind: "status" | "assign";
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  actor: Person;
};

const PERSON = "id, full_name, email, role";
const label = (v: string | null) => (isStatus(v) ? STATUS_LABELS[v] : v ?? "—");

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireProfile();
  const admin = profile.role === "admin";

  const [{ data: ticket }, { data: replies }, { data: events }, { data: admins }] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        `id, number, subject, body, status, priority, created_at, assignee_id, client:profiles!tickets_client_id_fkey(${PERSON}), assignee:profiles!tickets_assignee_id_fkey(${PERSON})`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_replies")
      .select(`id, body, created_at, author:profiles!ticket_replies_author_id_fkey(${PERSON})`)
      .eq("ticket_id", id)
      .order("created_at"),
    supabase
      .from("ticket_events")
      .select(`id, kind, from_value, to_value, created_at, actor:profiles!ticket_events_actor_id_fkey(${PERSON})`)
      .eq("ticket_id", id)
      .order("created_at"),
    admin
      ? supabase.from("profiles").select("id, full_name, email").eq("role", "admin").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string }[] }),
  ]);

  // RLS returns nothing for someone else's ticket, so that's a 404 rather than a leak.
  if (!ticket) notFound();
  const t = ticket as unknown as Ticket;

  return (
    <AppShell profile={profile} current="tickets">
      <Link href="/tickets" className="mb-4 inline-block text-sm text-[#a0a0b8] hover:text-[#f0f0f5]">
        ← All tickets
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4">
          <div className="psd-card rounded-2xl p-6">
            <p className="text-[13px] text-[#6b6b8a]">
              #{t.number} · {displayName(t.client)} · {formatDateTime(t.created_at)}
            </p>
            <h1 className="psd-title mt-1 text-[24px] font-bold">{t.subject}</h1>
            <div className="mt-3 flex gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${DARK_STATUS_STYLES[t.status]}`}>
                {STATUS_LABELS[t.status]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${DARK_PRIORITY_STYLES[t.priority]}`}>
                {PRIORITY_LABELS[t.priority]}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[#d0d0e0]">{t.body}</p>
          </div>

          {((replies ?? []) as unknown as Reply[]).map((r) => (
            <div key={r.id} className="psd-card rounded-2xl p-5">
              <p className="text-[13px] text-[#a0a0b8]">
                <span className="font-semibold text-[#f0f0f5]">{displayName(r.author)}</span> ·{" "}
                {roleLabel(r.author?.role)} · {formatDateTime(r.created_at)}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[15px] text-[#d0d0e0]">{r.body}</p>
            </div>
          ))}

          <form action={addReply.bind(null, t.id)} className="psd-card flex flex-col gap-3 rounded-2xl p-5">
            <textarea
              name="body"
              required
              rows={4}
              placeholder="Write a reply…"
              className="psd-input rounded-xl px-4 py-3 text-[15px] text-[#f0f0f5]"
            />
            <button type="submit" className="self-end rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white">
              Send reply
            </button>
          </form>
        </section>

        <aside className="flex flex-col gap-4">
          {admin && (
            <div className="psd-panel flex flex-col gap-4 rounded-2xl p-5">
              <form action={changeStatus.bind(null, t.id)} className="flex items-center gap-2">
                <select name="status" defaultValue={t.status} className="psd-select flex-1">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button type="submit" className="psd-action rounded-xl px-3 py-2 text-sm">Set status</button>
              </form>
              <form action={changePriority.bind(null, t.id)} className="flex items-center gap-2">
                <select name="priority" defaultValue={t.priority} className="psd-select flex-1">
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
                <button type="submit" className="psd-action rounded-xl px-3 py-2 text-sm">Set priority</button>
              </form>
              <form action={assignTicket.bind(null, t.id)} className="flex items-center gap-2">
                <select name="assigneeId" defaultValue={t.assignee_id ?? ""} className="psd-select flex-1">
                  <option value="">Unassigned</option>
                  {(admins ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{displayName(a)}</option>
                  ))}
                </select>
                <button type="submit" className="psd-action rounded-xl px-3 py-2 text-sm">Assign</button>
              </form>
            </div>
          )}

          {!admin && (
            <div className="psd-panel rounded-2xl p-5 text-sm text-[#a0a0b8]">
              Assigned to: <span className="text-[#f0f0f5]">{t.assignee ? displayName(t.assignee) : "Not yet"}</span>
            </div>
          )}

          <div className="psd-panel rounded-2xl p-5">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#6b6b8a]">History</h2>
            <ul className="flex flex-col gap-2 text-[13px] text-[#a0a0b8]">
              {((events ?? []) as unknown as Event[]).map((e) => (
                <li key={e.id}>
                  <span className="text-[#f0f0f5]">{displayName(e.actor)}</span>{" "}
                  {e.kind === "status"
                    ? `changed status ${label(e.from_value)} → ${label(e.to_value)}`
                    : `reassigned ${e.from_value ?? "—"} → ${e.to_value ?? "—"}`}
                  <span className="block text-[11px] text-[#6b6b8a]">{formatDateTime(e.created_at)}</span>
                </li>
              ))}
              {(events ?? []).length === 0 && <li>No changes yet.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
