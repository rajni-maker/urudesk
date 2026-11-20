import Link from "next/link";
import AppShell from "@/components/dashboard/AppShell";
import { requireProfile, displayName } from "@/lib/session";
import NewTicketForm from "./NewTicketForm";
import "@/components/tickets/ticket-form.css";

export default async function NewTicketPage() {
  const { supabase, profile } = await requireProfile();

  let clients: { id: string; label: string }[] | undefined;
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "client")
      .order("full_name");
    clients = (data ?? []).map((c) => ({ id: c.id, label: `${displayName(c)} · ${c.email}` }));
  }

  return (
    <AppShell profile={profile} current="tickets">
      <div className="mx-auto w-full max-w-[760px]">
        <Link href="/tickets" className="mb-4 inline-flex items-center gap-1 text-[13px] text-[#a8a8c4] hover:text-[#f0f0f5]">
          ← Back to tickets
        </Link>
        <h1 className="psd-title text-[26px] font-bold tracking-[-0.025em] sm:text-[28px]">Create a support ticket</h1>
        <p className="mb-6 mt-1.5 text-[15px] text-[#a8a8c4]">
          Tell us what you need help with. Our team will get back to you.
        </p>
        <NewTicketForm clients={clients} />
      </div>
    </AppShell>
  );
}
