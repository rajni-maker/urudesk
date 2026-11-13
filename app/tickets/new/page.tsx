import AppShell from "@/components/dashboard/AppShell";
import { requireProfile, displayName } from "@/lib/session";
import NewTicketForm from "./NewTicketForm";

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
      <h1 className="psd-title mb-6 text-[28px] font-bold tracking-[-0.025em]">New ticket</h1>
      <NewTicketForm clients={clients} />
    </AppShell>
  );
}
