import Link from "next/link";
import AppShell from "@/components/dashboard/AppShell";
import { requireAdmin } from "@/lib/session";
import { STATUS_OPTIONS, STATUS_LABELS } from "@/lib/tickets";

const BAR: Record<string, string> = {
  open: "from-[#6366f1] to-[#818cf8]",
  in_progress: "from-[#f59e0b] to-[#fbbf24]",
  resolved: "from-[#22c55e] to-[#4ade80]",
};

export default async function DashboardPage() {
  const { supabase, profile } = await requireAdmin();

  const counts = await Promise.all(
    STATUS_OPTIONS.map(async (status) => {
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", status);
      return { status, count: count ?? 0 };
    }),
  );
  const max = Math.max(1, ...counts.map((c) => c.count));

  // Per-company totals: one light query (company_id + status), tallied here.
  const [{ data: companyRows }, { data: ticketRows }, { data: memberRows }] = await Promise.all([
    supabase.from("companies").select("id, name, domain").order("name"),
    supabase.from("tickets").select("company_id, status").not("company_id", "is", null),
    supabase.from("profiles").select("company_id").not("company_id", "is", null),
  ]);
  const tally = new Map<string, { total: number; active: number; people: number }>();
  const get = (id: string) => tally.get(id) ?? tally.set(id, { total: 0, active: 0, people: 0 }).get(id)!;
  for (const r of ticketRows ?? []) {
    const t = get(r.company_id as string);
    t.total++;
    if (r.status !== "resolved") t.active++;
  }
  for (const r of memberRows ?? []) get(r.company_id as string).people++;
  const companies = (companyRows ?? [])
    .map((co) => ({ ...co, ...(tally.get(co.id) ?? { total: 0, active: 0, people: 0 }) }))
    .sort((a, b) => b.active - a.active || b.total - a.total || a.name.localeCompare(b.name));

  return (
    <AppShell profile={profile} current="dashboard">
      <h1 className="psd-title mb-6 text-[28px] font-bold tracking-[-0.025em]">Dashboard</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {counts.map((c) => (
          <Link key={c.status} href={`/tickets?status=${c.status}`} className="psd-card rounded-2xl p-5">
            <p className="text-[13px] text-[#a0a0b8]">{STATUS_LABELS[c.status]}</p>
            <p className="mt-1 text-[32px] font-bold">{c.count}</p>
          </Link>
        ))}
      </div>

      {/* Tickets per status: plain CSS bars, no chart library. */}
      <div className="psd-card rounded-2xl p-6">
        <h2 className="mb-4 text-[15px] font-semibold">Tickets by status</h2>
        <div className="flex h-48 gap-6">
          {counts.map((c) => (
            <div key={c.status} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[13px] text-[#a0a0b8]">{c.count}</span>
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-[96px] rounded-t-lg bg-gradient-to-t ${BAR[c.status]}`}
                  style={{ height: `${(c.count / max) * 100}%`, minHeight: c.count ? 4 : 0 }}
                />
              </div>
              <span className="text-[12px] text-[#6b6b8a]">{STATUS_LABELS[c.status]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="psd-card mt-8 overflow-hidden rounded-2xl">
        <h2 className="px-6 pb-3 pt-5 text-[15px] font-semibold">Companies</h2>
        {companies.length === 0 ? (
          <p className="px-6 pb-6 text-[14px] text-[#a0a0b8]">No client companies yet. They appear as clients sign up.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {companies.map((co) => (
              <li key={co.id}>
                <Link
                  href={`/tickets?company=${co.id}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-3.5 hover:bg-white/[0.03]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#f0f0f5]">{co.name}</span>
                    <span className="text-[12px] text-[#6b6b8a]">
                      {co.domain ? `@${co.domain}` : "Personal email"} · {co.people} {co.people === 1 ? "person" : "people"}
                    </span>
                  </span>
                  <span className="text-[13px] text-[#a0a0b8]">
                    <span className="font-semibold text-[#f0f0f5]">{co.active}</span> active
                  </span>
                  <span className="w-20 text-right text-[13px] text-[#6b6b8a]">{co.total} total</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
