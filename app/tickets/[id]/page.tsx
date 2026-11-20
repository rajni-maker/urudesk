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
import { assignTicket, changePriority, changeStatus } from "../actions";
import ReplyBox from "@/components/tickets/ReplyBox";
import { sanitizeTicketHtml } from "@/lib/richtext";
import { formatBytes } from "@/lib/attachments";
import "@/components/tickets/ticket-form.css";
import { approvePendingTicket, rejectPendingTicket } from "../pending-actions";

type Person = { id: string; full_name: string; email: string; role: string } | null;
type Ticket = {
  id: string;
  number: number;
  subject: string;
  body: string;
  body_html: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  assignee_id: string | null;
  pending_email: string | null;
  client: Person;
  assignee: Person;
};
type Reply = { id: string; body: string; body_html: string | null; created_at: string; author: Person };
type Attachment = { id: string; file_name: string; mime_type: string; size_bytes: number };

/** Stored HTML is sanitised on write; sanitise again on render in case of older or hand-edited rows. */
function Body({ text, html, className }: { text: string; html: string | null; className: string }) {
  return html ? (
    <div className={`rich-body ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeTicketHtml(html) }} />
  ) : (
    <p className={`whitespace-pre-wrap ${className}`}>{text}</p>
  );
}
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

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; attachments?: string }>;
}) {
  const { id } = await params;
  const flags = await searchParams;
  const { supabase, profile } = await requireProfile();
  const admin = profile.role === "admin";

  const [{ data: ticket }, { data: replies }, { data: events }, { data: admins }, { data: attachments }] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        `id, number, subject, body, body_html, status, priority, created_at, assignee_id, pending_email, client:profiles!tickets_client_id_fkey(${PERSON}), assignee:profiles!tickets_assignee_id_fkey(${PERSON})`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_replies")
      .select(`id, body, body_html, created_at, author:profiles!ticket_replies_author_id_fkey(${PERSON})`)
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
    supabase
      .from("ticket_attachments")
      .select("id, file_name, mime_type, size_bytes")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);

  // RLS returns nothing for someone else's ticket, so that's a 404 rather than a leak.
  if (!ticket) notFound();
  const t = ticket as unknown as Ticket;

  return (
    <AppShell profile={profile} current="tickets">
      <Link href="/tickets" className="mb-4 inline-block text-sm text-[#a0a0b8] hover:text-[#f0f0f5]">
        ← All tickets
      </Link>

      {flags.created && (
        <p role="status" className="mb-4 rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#86efac]">
          Ticket #{t.number} created. We&apos;ve notified the support team and will reply here and by email.
        </p>
      )}
      {flags.attachments === "failed" && (
        <p role="alert" className="mb-4 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fca5a5]">
          The ticket was created, but its attachments couldn&apos;t be saved. Please add them in a reply or email them to support.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-4">
          <div className="psd-card rounded-2xl p-6">
            <p className="text-[13px] text-[#6b6b8a]">
              #{t.number} · {t.client ? displayName(t.client) : t.pending_email} · {formatDateTime(t.created_at)}
            </p>
            {admin && !t.client && t.pending_email && (
              <div className="mt-3 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/[0.08] p-4">
                <p className="text-sm text-[#fbbf24]">
                  Waiting for approval: <strong>{t.pending_email}</strong> is not a verified client.
                  Approving adds them as a client (with an invite if they have no account) and
                  sends them the ticket confirmation. Rejecting deletes this ticket.
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={approvePendingTicket.bind(null, t.id)}>
                    <button type="submit" className="rounded-lg bg-[#22c55e]/20 px-3 py-1.5 text-sm font-semibold text-[#4ade80]">
                      Approve sender
                    </button>
                  </form>
                  <form action={rejectPendingTicket.bind(null, t.id)}>
                    <button type="submit" className="rounded-lg bg-[#ef4444]/15 px-3 py-1.5 text-sm font-semibold text-[#f87171]">
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            )}
            <h1 className="psd-title mt-1 text-[24px] font-bold">{t.subject}</h1>
            <div className="mt-3 flex gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${DARK_STATUS_STYLES[t.status]}`}>
                {STATUS_LABELS[t.status]}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${DARK_PRIORITY_STYLES[t.priority]}`}>
                {PRIORITY_LABELS[t.priority]}
              </span>
            </div>
            <Body text={t.body} html={t.body_html} className="mt-4 text-[15px] leading-relaxed text-[#d0d0e0]" />
            {((attachments ?? []) as Attachment[]).length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="mb-2 text-[13px] font-semibold text-[#a0a0b8]">Attachments</p>
                <ul className="flex flex-wrap gap-2">
                  {((attachments ?? []) as Attachment[]).map((a) => {
                    const href = `/tickets/${t.id}/attachments/${a.id}`;
                    const image = a.mime_type.startsWith("image/");
                    return (
                      <li key={a.id}>
                        <a
                          href={image ? `${href}?inline` : href}
                          target={image ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="nt-file max-w-[280px] text-[14px] text-[#f0f0f5] hover:border-[#8b5cf6]"
                        >
                          <span className="truncate">{a.file_name}</span>
                          <span className="shrink-0 text-[12px] text-[#9a9ab8]">{formatBytes(a.size_bytes)}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {((replies ?? []) as unknown as Reply[]).map((r) => (
            <div key={r.id} className="psd-card rounded-2xl p-5">
              <p className="text-[13px] text-[#a0a0b8]">
                <span className="font-semibold text-[#f0f0f5]">{displayName(r.author)}</span> ·{" "}
                {roleLabel(r.author?.role)} · {formatDateTime(r.created_at)}
              </p>
              <Body text={r.body} html={r.body_html} className="mt-2 text-[15px] text-[#d0d0e0]" />
            </div>
          ))}

          <ReplyBox ticketId={t.id} />
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
