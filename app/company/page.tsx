import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/dashboard/AppShell";
import { requireProfile, displayName } from "@/lib/session";
import ContactForm from "./ContactForm";
import "@/components/tickets/ticket-form.css";
import "./company.css";

type Member = { id: string; full_name: string; email: string; phone: string; phone2: string };

// Client view of their company: name, colleagues and their contact numbers,
// and a form to update their own. Admins manage companies from the ticket list.
export default async function CompanyPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role === "admin") redirect("/tickets");

  const { data: me } = await supabase
    .from("profiles")
    .select("phone, phone2, company:companies(id, name, domain)")
    .eq("id", profile.id)
    .single();
  const company = (me?.company ?? null) as unknown as { id: string; name: string; domain: string | null } | null;

  // RLS shows only people in the caller's company (plus admins, filtered out here).
  const { data: rows } = company
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, phone, phone2")
        .eq("company_id", company.id)
        .eq("role", "client")
        .order("full_name")
    : { data: [] };
  const members = (rows ?? []) as Member[];

  return (
    <AppShell profile={profile} current="company">
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="psd-title text-[26px] font-bold tracking-[-0.025em] sm:text-[28px]">
          {company?.name ?? "Your company"}
        </h1>
        <p className="mb-6 mt-1.5 text-[15px] text-[#a8a8c4]">
          {company?.domain
            ? <>Anyone who signs up with an <strong className="text-[#f0f0f5]">@{company.domain}</strong> email joins this company and can see and reply to its <Link href="/tickets" className="co-link">tickets</Link>.</>
            : "Tickets you raise are visible only to you and the support team."}
        </p>

        <section className="nt-card co-card" aria-labelledby="contact-title">
          <h2 id="contact-title" className="co-h2">Your contact numbers</h2>
          <p className="co-sub">The support team uses these if they need to call you about a ticket.</p>
          <ContactForm phone={me?.phone ?? ""} phone2={me?.phone2 ?? ""} />
        </section>

        <section className="nt-card co-card" aria-labelledby="people-title">
          <h2 id="people-title" className="co-h2">
            People <span className="co-count">{members.length}</span>
          </h2>
          <ul className="co-list">
            {members.map((m) => (
              <li key={m.id} className="co-row">
                <div className="co-who">
                  <span className="co-name">
                    {displayName(m)}
                    {m.id === profile.id && <span className="co-you">You</span>}
                  </span>
                  <a href={`mailto:${m.email}`} className="co-mail">{m.email}</a>
                </div>
                <div className="co-phones">
                  {[m.phone, m.phone2].filter(Boolean).map((p) => (
                    <a key={p} href={`tel:${p.replace(/[^\d+]/g, "")}`} className="co-phone">{p}</a>
                  ))}
                  {!m.phone && !m.phone2 && <span className="co-none">No number</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
