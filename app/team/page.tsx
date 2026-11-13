import AppShell from "@/components/dashboard/AppShell";
import { requireAdmin, displayName } from "@/lib/session";
import { roleLabel } from "@/lib/roles";
import InviteForm from "./InviteForm";
import DeleteButton from "./DeleteButton";

export default async function TeamPage() {
  const { supabase, profile } = await requireAdmin();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("role")
    .order("full_name");

  return (
    <AppShell profile={profile} current="team">
      <h1 className="psd-title mb-6 text-[28px] font-bold tracking-[-0.025em]">Team</h1>
      <div className="mb-6">
        <InviteForm />
      </div>
      <div className="psd-card overflow-hidden rounded-2xl">
        <ul className="divide-y divide-white/[0.06]">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <span className="flex-1 font-medium">{displayName(m)}</span>
              <span className="text-[13px] text-[#a0a0b8]">{m.email}</span>
              <span className="w-32 text-right text-[13px] text-[#6b6b8a]">{roleLabel(m.role)}</span>
              <span className="w-20 text-right">
                {m.id !== profile.id && <DeleteButton userId={m.id} label={m.email} />}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
