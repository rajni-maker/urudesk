import Link from "next/link";
import AppShell from "@/components/dashboard/AppShell";
import AutoSubmitSelect from "@/components/tickets/AutoSubmitSelect";
import { requireProfile, displayName } from "@/lib/session";
import {
  parseFilters,
  formatDateTime,
  timeAgo,
  STATUS_OPTIONS,
  STATUS_LABELS,
  DARK_STATUS_STYLES,
  PRIORITY_OPTIONS,
  PRIORITY_LABELS,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/tickets";
import "@/components/tickets/ticket-list.css";

type Person = { full_name: string; email: string } | null;
type Row = {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  pending_email: string | null;
  client_id: string | null;
  company: { name: string } | null;
  client: Person;
  assignee: Person;
};
type Param = string | string[] | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEARCH_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: Param; priority?: Param; q?: Param; company?: Param }>;
}) {
  const { supabase, profile } = await requireProfile();
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 100) ?? "";
  const admin = profile.role === "admin";
  // Company filter is admin-only; clients already see just their own company.
  const companyRaw = Array.isArray(sp.company) ? sp.company[0] : sp.company;
  const companyId = admin && companyRaw && UUID.test(companyRaw) ? companyRaw : null;

  // "#42" or "42" jumps to a ticket number; anything else matches the subject.
  // LIKE wildcards in the user's text are escaped so they match literally.
  const numberMatch = /^#?(\d{1,9})$/.exec(q);
  const subjectPattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  // Every query below shares the search + priority narrowing; status is applied per use.
  // RLS already limits clients to their own tickets, so no client_id filter is needed.
  // Structural type keeps TS from expanding the full PostgREST builder generics.
  type Narrowable = { eq(col: string, v: string | number): Narrowable; ilike(col: string, p: string): Narrowable };
  const narrow = <T,>(query: T): T => {
    let out = query as unknown as Narrowable;
    if (filters.priority) out = out.eq("priority", filters.priority);
    if (companyId) out = out.eq("company_id", companyId);
    if (numberMatch) out = out.eq("number", Number(numberMatch[1]));
    else if (q) out = out.ilike("subject", subjectPattern);
    return out as unknown as T;
  };

  let list = narrow(
    supabase
      .from("tickets")
      .select(
        "id, number, subject, status, priority, created_at, updated_at, pending_email, client_id, company:companies(name), client:profiles!tickets_client_id_fkey(full_name, email), assignee:profiles!tickets_assignee_id_fkey(full_name, email)",
      ),
  );
  if (filters.status) list = list.eq("status", filters.status);

  const [{ data, error }, { data: companyRows }, ...counts] = await Promise.all([
    list.order("updated_at", { ascending: false }),
    admin
      ? supabase.from("companies").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ...STATUS_OPTIONS.map((s) =>
      narrow(supabase.from("tickets").select("id", { count: "exact", head: true })).eq("status", s),
    ),
  ]);
  const tickets = (data ?? []) as unknown as Row[];
  const countFor = Object.fromEntries(STATUS_OPTIONS.map((s, i) => [s, counts[i].count ?? 0])) as Record<TicketStatus, number>;
  const total = STATUS_OPTIONS.reduce((n, s) => n + countFor[s], 0);
  const filtered = Boolean(filters.status || filters.priority || q || companyId);
  const companies = (companyRows ?? []) as { id: string; name: string }[];

  // Links keep the other filters, so switching tabs doesn't throw away a search.
  const href = (status: TicketStatus | null) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (filters.priority) p.set("priority", filters.priority);
    if (q) p.set("q", q);
    if (companyId) p.set("company", companyId);
    const s = p.toString();
    return s ? `/tickets?${s}` : "/tickets";
  };

  const tabs: { key: TicketStatus | null; label: string; count: number }[] = [
    { key: null, label: "All", count: total },
    ...STATUS_OPTIONS.map((s) => ({ key: s, label: STATUS_LABELS[s], count: countFor[s] })),
  ];

  return (
    <AppShell profile={profile} current="tickets">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="psd-title text-[26px] font-bold tracking-[-0.025em] sm:text-[28px]">
              {admin ? "All tickets" : "My tickets"}
            </h1>
            <p className="mt-1 text-[15px] text-[#a8a8c4]">
              {admin ? "Every request from every client, most recently updated first." : "Requests from you and your colleagues, most recently updated first."}
            </p>
          </div>
          <Link href="/tickets/new" className="tl-primary">
            <span aria-hidden className="text-[18px] leading-none">+</span> New ticket
          </Link>
        </div>

        <nav className="tl-tabs" aria-label="Filter by status">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={href(t.key)}
              className="tl-tab"
              aria-current={filters.status === t.key ? "page" : undefined}
            >
              {t.label}
              <span className="tl-count">{t.count}</span>
            </Link>
          ))}
        </nav>

        {/* Plain GET form: filters live in the URL and survive reloads and sharing. */}
        <form className="tl-toolbar" role="search">
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          <label className="tl-search">
            <span className="sr-only">Search tickets</span>
            {SEARCH_ICON}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by subject or #number"
              className="tl-control"
              maxLength={100}
            />
          </label>
          <label>
            <span className="sr-only">Priority</span>
            <AutoSubmitSelect name="priority" defaultValue={filters.priority ?? ""} className="tl-control">
              <option value="">Any priority</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]} priority</option>
              ))}
            </AutoSubmitSelect>
          </label>
          {admin && companies.length > 0 && (
            <label>
              <span className="sr-only">Company</span>
              <AutoSubmitSelect name="company" defaultValue={companyId ?? ""} className="tl-control">
                <option value="">All companies</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>{co.name}</option>
                ))}
              </AutoSubmitSelect>
            </label>
          )}
          <button type="submit" className="tl-btn">Search</button>
          {filtered && <Link href="/tickets" className="tl-clear">Clear filters</Link>}
          <span className="tl-summary" aria-live="polite">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </span>
        </form>

        {error && (
          <p role="alert" className="mb-4 rounded-lg border border-[#7f1d1d] bg-[#2a0f14] px-4 py-3 text-sm text-[#fca5a5]">
            Couldn&apos;t load tickets: {error.message}
          </p>
        )}

        <div className="tl-card">
          {tickets.length === 0 ? (
            <div className="tl-empty">
              <span className="tl-empty-icon" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v12H8l-4 4z" />
                </svg>
              </span>
              {filtered ? (
                <>
                  <h2>No tickets match these filters</h2>
                  <p>Try a different search or status, or clear the filters to see everything.</p>
                  <Link href="/tickets" className="tl-btn inline-flex items-center">Clear filters</Link>
                </>
              ) : (
                <>
                  <h2>No tickets yet</h2>
                  <p>
                    {admin
                      ? "Tickets created by clients or sent to the support inbox will appear here."
                      : "When you need help, create a ticket and you can follow its progress here."}
                  </p>
                  <Link href="/tickets/new" className="tl-primary">Create a ticket</Link>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="tl-grid tl-head" aria-hidden>
                <span>#</span>
                <span>Subject</span>
                <span>Priority</span>
                <span>Status</span>
                <span className="tl-col-agent">Agent</span>
                <span>Updated</span>
              </div>
              <ul className="tl-list">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tickets/${t.id}`} className="tl-grid tl-row">
                      <span className="tl-num">#{t.number}</span>
                      <span className="tl-col-subject min-w-0">
                        <span className="tl-subject">{t.subject}</span>
                        <span className="tl-meta">
                          {admin ? (
                            t.client ? (
                              <>
                                {displayName(t.client)}
                                {t.company && <span className="tl-company"> · {t.company.name}</span>}
                              </>
                            ) : (
                              <span className="tl-pending">Awaiting approval · {t.pending_email}</span>
                            )
                          ) : (
                            <>
                              Opened {formatDateTime(t.created_at)}
                              {t.client_id !== profile.id && t.client && <> by {displayName(t.client)}</>}
                            </>
                          )}
                        </span>
                      </span>
                      <span className={`tl-col-prio tl-prio tl-prio-${t.priority}`}>
                        <span className="tl-bars" aria-hidden><i /><i /><i /></span>
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                      <span className="tl-col-status">
                        <span className={`tl-status ${DARK_STATUS_STYLES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                      </span>
                      <span className="tl-col-agent">
                        {t.assignee ? (
                          <span className="tl-agent">{displayName(t.assignee)}</span>
                        ) : (
                          <span className="tl-muted">{admin ? "Unassigned" : "Not yet assigned"}</span>
                        )}
                      </span>
                      <time className="tl-col-time tl-time" dateTime={t.updated_at} title={formatDateTime(t.updated_at)}>
                        {timeAgo(t.updated_at)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
