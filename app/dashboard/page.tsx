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
    </AppShell>
  );
}
