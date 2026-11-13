import Link from "next/link";
import { Sparkles } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { initials } from "./avatar";

// Shared top bar for every signed-in page: brand, role-aware links, the
// current user, and logout. `current` marks the active entry.
//
// Takes everything it renders as props — each page has already loaded the
// profile it needs, so this component issues no queries of its own.
export default function DashboardNav({
  name,
  role,
  admin,
  current,
}: {
  name: string;
  role: string;
  admin: boolean;
  /* Which nav entry to mark as the current page. */
  current: "dashboard" | "tickets" | "team";
}) {
  const links = [
    ...(admin ? [{ href: "/dashboard", label: "Dashboard", key: "dashboard" }] : []),
    { href: "/tickets", label: "Tickets", key: "tickets" },
    ...(admin ? [{ href: "/team", label: "Team", key: "team" }] : []),
].map((l) => ({ ...l, active: l.key === current }));

  return (
    <header className="sticky top-0 z-50 flex h-[68px] items-center justify-between border-b border-white/[0.06] bg-[#11112a]/80 px-4 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-6 lg:gap-10">
        <Link
          href="/tickets"
          className="flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.02em] text-[#f0f0f5]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <Sparkles className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
          </span>
          PixelSupport
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={l.active ? "page" : undefined}
              className={
                l.active
                  ? "relative rounded-xl bg-[#8b5cf6]/[0.12] px-4 py-2 text-sm font-semibold text-[#f0f0f5] after:absolute after:inset-x-4 after:-bottom-0.5 after:h-0.5 after:rounded-sm after:bg-gradient-to-r after:from-[#8b5cf6] after:to-[#06b6d4] after:content-['']"
                  : "rounded-xl px-4 py-2 text-sm font-medium text-[#a0a0b8] transition-colors hover:bg-white/[0.04] hover:text-[#f0f0f5]"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] text-[12px] font-bold text-white shadow-[0_0_12px_rgba(139,92,246,0.2)]">
            {initials(name)}
          </span>
          <span className="hidden flex-col leading-tight md:flex">
            <span className="text-[13px] font-semibold text-[#f0f0f5]">{name}</span>
            <span className="text-[11px] text-[#6b6b8a]">{role}</span>
          </span>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-[#a0a0b8] transition-colors hover:border-white/[0.12] hover:bg-white/[0.08] hover:text-[#f0f0f5]"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
