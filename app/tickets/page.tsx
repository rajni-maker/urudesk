import Link from "next/link";
import AppShell from "@/components/dashboard/AppShell";
import { requireProfile, displayName } from "@/lib/session";
import {
  parseFilters,
  formatDateTime,
  STATUS_OPTIONS,
  STATUS_LABELS,
  DARK_STATUS_STYLES,
  PRIORITY_OPTIONS,
  PRIORITY_LABELS,
  DARK_PRIORITY_STYLES,
  type TicketStatus,
  type TicketPriority,
} from "@/lib/tickets";

type Person = { full_name: string; email: string } | null;
type Row = {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  client: Person;
  assignee: Person;
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[]; priority?: string | string[] }>;
}) {
  const { supabase, profile } = await requireProfile();
  const filters = parseFilters(await searchParams);
  const admin = profile.role === "admin";

  // RLS already limits clients to their own tickets; no client_id filter needed.
  let query = supabase
    .from("tickets")
    .select(
      "id, number, subject, status, priority, created_at, client:profiles!tickets_client_id_fkey(full_name, email), assignee:profiles!tickets_assignee_id_fkey(full_name, email)",
    )
    .order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  const { data, error } = await query;
  const tickets = (data ?? []) as unknown as Row[];

  return (
    <AppShell profile={profile} current="tickets">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="psd-title text-[28px] font-bold tracking-[-0.025em]">
          {admin ? "All tickets" : "My tickets"}
        </h1>
        <Link
          href="/tickets/new"
          className="rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white"
        >
          New ticket
        </Link>
      </div>

      {/* Plain GET form: filters live in the URL, no client JS. */}
      <form className="mb-5 flex flex-wrap items-end gap-3">
        <select name="status" defaultValue={filters.status ?? ""} className="psd-select">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select name="priority" defaultValue={filters.priority ?? ""} className="psd-select">
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        <button type="submit" className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-[#f0f0f5]">
          Filter
        </button>
        {(filters.status || filters.priority) && (
          <Link href="/tickets" className="text-sm text-[#a0a0b8] hover:text-[#f0f0f5]">Clear</Link>
        )}
      </form>

      {error && <p className="text-sm text-[#f87171]">Couldn&apos;t load tickets: {error.message}</p>}

      <div className="psd-card overflow-hidden rounded-2xl">
        {tickets.length === 0 ? (
          <p className="p-8 text-center text-[#a0a0b8]">No tickets yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/tickets/${t.id}`} className="psd-row flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className="w-14 text-[13px] text-[#6b6b8a]">#{t.number}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.subject}</span>
                  {admin && <span className="text-[13px] text-[#a0a0b8]">{displayName(t.client)}</span>}
                  <span className="text-[13px] text-[#a0a0b8]">
                    {t.assignee ? displayName(t.assignee) : "Unassigned"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${DARK_PRIORITY_STYLES[t.priority]}`}>
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${DARK_STATUS_STYLES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                  <span className="text-[12px] text-[#6b6b8a]">{formatDateTime(t.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
