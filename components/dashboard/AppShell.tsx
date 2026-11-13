import "@/components/dashboard/dark.css";
import DashboardNav from "./DashboardNav";
import { roleLabel } from "@/lib/roles";
import { displayName, type Profile } from "@/lib/session";

// Dark frame + top nav shared by every signed-in page.
export default function AppShell({
  profile,
  current,
  children,
}: {
  profile: Profile;
  current: "dashboard" | "tickets" | "team";
  children: React.ReactNode;
}) {
  return (
    <div className="psd-shell min-h-screen bg-[#0a0a1a] font-[family-name:var(--font-inter)] text-[#f0f0f5] antialiased">
      <div className="relative z-[1]">
        <DashboardNav
          name={displayName(profile)}
          role={roleLabel(profile.role)}
          admin={profile.role === "admin"}
          current={current}
        />
        <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
