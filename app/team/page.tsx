import AppShell from "@/components/dashboard/AppShell";
import { requireAdmin, displayName } from "@/lib/session";
import { initials, avatarGradient } from "@/components/dashboard/avatar";
import InviteForm from "./InviteForm";
import DeleteButton from "./DeleteButton";
import "@/components/tickets/ticket-form.css";
import "@/components/dashboard/admin.css";

const joined = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function TeamPage() {
  const { supabase, profile } = await requireAdmin();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("role", "admin") // internal staff only; clients are under Dashboard → Companies
    .order("full_name");
  const members = data ?? [];

  return (
    <AppShell profile={profile} current="team">
      <div className="mx-auto w-full max-w-[820px]">
        <div className="ad-head">
          <div>
            <h1 className="ad-title">Team</h1>
            <p className="ad-sub">Support staff who can see, assign and answer every ticket.</p>
          </div>
        </div>

        <section className="ad-card tm-invite" aria-labelledby="invite-title">
          <h2 id="invite-title" className="ad-h2">Invite a teammate</h2>
          <p className="tm-help">They&apos;ll get an email to set a password, then join as an admin.</p>
          <InviteForm />
        </section>

        <section className="ad-card" aria-labelledby="members-title">
          <div className="ad-card-head">
            <h2 id="members-title" className="ad-h2">
              Members <span className="ad-count">{members.length}</span>
            </h2>
          </div>
          <ul className="ad-list">
            {members.map((m) => {
              const name = displayName(m);
              const me = m.id === profile.id;
              return (
                <li key={m.id} className="tm-row">
                  <span className={`tm-avatar ${avatarGradient(m.id)}`} aria-hidden>{initials(name)}</span>
                  <span className="tm-who">
                    <span className="tm-name">
                      {name}
                      {me && <span className="tm-tag tm-tag-you">You</span>}
                    </span>
                    <span className="tm-email">{m.email}</span>
                  </span>
                  <span className="tm-joined">Joined {joined(m.created_at)}</span>
                  {me ? <span className="tm-spacer" aria-hidden /> : <DeleteButton userId={m.id} label={name} />}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
