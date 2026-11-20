import Link from "next/link";
import AppShell from "@/components/dashboard/AppShell";
import { requireAdmin, displayName } from "@/lib/session";
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  DARK_STATUS_STYLES,
  timeAgo,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/tickets";
import "@/components/tickets/ticket-list.css";
import "@/components/dashboard/admin.css";

const STACK_COLOR: Record<TicketStatus, string> = {
  open: "#818cf8",
  in_progress: "#fbbf24",
  resolved: "#4ade80",
};

type Attention = {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  updated_at: string;
  assignee_id: string | null;
  client: { full_name: string; email: string } | null;
  company: { name: string } | null;
};

const head = { count: "exact", head: true } as const;

export default async function DashboardPage() {
  const { supabase, profile } = await requireAdmin();

  const [statusCounts, unassigned, pending, attention, companyRows, ticketRows, memberRows] = await Promise.all([
    Promise.all(
      STATUS_OPTIONS.map(async (status) => {
        const { count } = await supabase.from("tickets").select("id", head).eq("status", status);
        return { status, count: count ?? 0 };
      }),
    ),
    supabase
      .from("tickets")
      .select("id", head)
      .neq("status", "resolved")
      .is("assignee_id", null)
      .not("client_id", "is", null),
    supabase.from("tickets").select("id", head).is("client_id", null),
    supabase
      .from("tickets")
      .select(
        "id, number, subject, status, priority, updated_at, assignee_id, company:companies(name), client:profiles!tickets_client_id_fkey(full_name, email)",
      )
      .neq("status", "resolved")
      .not("client_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase.from("companies").select("id, name, domain").order("name"),
    supabase.from("tickets").select("company_id, status").not("company_id", "is", null),
    supabase.from("profiles").select("company_id").eq("role", "client").not("company_id", "is", null),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((c) => [c.status, c.count])) as Record<TicketStatus, number>;
  const total = statusCounts.reduce((n, c) => n + c.count, 0);
  const attentionRows = (attention.data ?? []) as unknown as Attention[];

  // Per-company totals, tallied from two light queries.
  const tally = new Map<string, { total: number; active: number; people: number }>();
  const get = (id: string) => tally.get(id) ?? tally.set(id, { total: 0, active: 0, people: 0 }).get(id)!;
  for (const r of ticketRows.data ?? []) {
    const t = get(r.company_id as string);
    t.total++;
    if (r.status !== "resolved") t.active++;
  }
  for (const r of memberRows.data ?? []) get(r.company_id as string).people++;
  const companies = (companyRows.data ?? [])
    .map((co) => ({ ...co, ...(tally.get(co.id) ?? { total: 0, active: 0, people: 0 }) }))
    .sort((a, b) => b.active - a.active || b.total - a.total || a.name.localeCompare(b.name));

  const kpis = [
    { key: "open", label: "Open", value: byStatus.open, note: "Waiting for a first response", href: "/tickets?status=open" },
    { key: "in_progress", label: "In progress", value: byStatus.in_progress, note: "Being worked on", href: "/tickets?status=in_progress" },
    { key: "unassigned", label: "Unassigned", value: unassigned.count ?? 0, note: "Active tickets with no agent", href: null },
    { key: "pending", label: "Awaiting approval", value: pending.count ?? 0, note: "Emails from unknown senders", href: null },
  ];

  return (
    <AppShell profile={profile} current="dashboard">
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Dashboard</h1>
          <p className="ad-sub">Where your support queue stands right now.</p>
        </div>
        <Link href="/tickets" className="tl-primary">View all tickets</Link>
      </div>

      <div className="ad-kpis">
        {kpis.map((k) => {
          const body = (
            <>
              <span className="ad-kpi-label">
                <span className={`ad-dot ad-dot-${k.key}`} aria-hidden />
                {k.label}
              </span>
              <span className="ad-kpi-value">{k.value}</span>
              <span className="ad-kpi-note">{k.note}</span>
            </>
          );
          return k.href ? (
            <Link key={k.key} href={k.href} className="ad-card ad-kpi">{body}</Link>
          ) : (
            <div key={k.key} className="ad-card ad-kpi">{body}</div>
          );
        })}
      </div>

      <div className="ad-grid">
        <section className="ad-card" aria-labelledby="attention-title">
          <div className="ad-card-head">
            <h2 id="attention-title" className="ad-h2">Recently active</h2>
            <Link href="/tickets" className="ad-more">All tickets →</Link>
          </div>
          {attentionRows.length === 0 ? (
            <p className="ad-empty">Nothing open. Every ticket is resolved.</p>
          ) : (
            <ul className="ad-list">
              {attentionRows.map((t) => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="ad-row">
                    <span className="ad-num">#{t.number}</span>
                    <span className="min-w-0">
                      <span className="ad-subject">{t.subject}</span>
                      <span className="ad-meta">
                        {displayName(t.client)}
                        {t.company && ` · ${t.company.name}`} · {timeAgo(t.updated_at)}
                      </span>
                    </span>
                    <span className="ad-side">
                      {!t.assignee_id && <span className="ad-unassigned">Unassigned</span>}
                      <span className={`tl-prio tl-prio-${t.priority}`} title={`${PRIORITY_LABELS[t.priority]} priority`}>
                        <span className="tl-bars" aria-hidden><i /><i /><i /></span>
                        <span className="sr-only">{PRIORITY_LABELS[t.priority]} priority</span>
                      </span>
                      <span className={`tl-status ${DARK_STATUS_STYLES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ad-card" aria-labelledby="status-title">
          <div className="ad-card-head">
            <h2 id="status-title" className="ad-h2">Tickets by status</h2>
          </div>
          <div className="ad-break">
            <div className="ad-stack" role="img" aria-label={STATUS_OPTIONS.map((s) => `${STATUS_LABELS[s]} ${byStatus[s]}`).join(", ")}>
              {STATUS_OPTIONS.map((s) =>
                byStatus[s] ? (
                  <span key={s} style={{ width: `${(byStatus[s] / total) * 100}%`, background: STACK_COLOR[s] }} />
                ) : null,
              )}
            </div>
            <ul className="ad-legend">
              {STATUS_OPTIONS.map((s) => (
                <li key={s}>
                  <Link href={`/tickets?status=${s}`}>
                    <span className={`ad-dot ad-dot-${s}`} aria-hidden />
                    {STATUS_LABELS[s]}
                    <span className="ad-n">{byStatus[s]}</span>
                    <span className="ad-pct">{total ? Math.round((byStatus[s] / total) * 100) : 0}%</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="ad-total">
              Total tickets <b>{total}</b>
            </div>
          </div>
        </section>
      </div>

      <section className="ad-card" aria-labelledby="companies-title">
        <div className="ad-card-head">
          <h2 id="companies-title" className="ad-h2">
            Companies <span className="ad-count">{companies.length}</span>
          </h2>
        </div>
        {companies.length === 0 ? (
          <p className="ad-empty">No client companies yet. They appear as clients sign up.</p>
        ) : (
          <>
            <div className="ad-table-head" aria-hidden>
              <span>Company</span>
              <span>People</span>
              <span>Active</span>
              <span>Total</span>
            </div>
            <ul className="ad-list">
              {companies.map((co) => (
                <li key={co.id}>
                  <Link href={`/tickets?company=${co.id}`} className="ad-co">
                    <span className="min-w-0">
                      <span className="ad-co-name">{co.name}</span>
                      <span className="ad-co-domain">{co.domain ? `@${co.domain}` : "Personal email"}</span>
                    </span>
                    <span className="ad-cell">{co.people}<span className="ad-lbl"> people</span></span>
                    <span className={`ad-cell ${co.active ? "ad-cell-strong" : "ad-cell-zero"}`}>
                      {co.active}<span className="ad-lbl"> active</span>
                    </span>
                    <span className="ad-cell">{co.total}<span className="ad-lbl"> total</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </AppShell>
  );
}
