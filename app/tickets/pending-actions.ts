"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { createAdmin } from "@/lib/supabase/admin";
import { notifyEmailTicketCreated } from "@/lib/email";

// Admin-only. Emailed tickets from unknown / unverified senders arrive with
// client_id null and pending_email set. Approving links the ticket to that
// sender (inviting them as a client if they have no account); rejecting
// deletes it. Service role is used because the ticket has no owner yet.

async function loadPending(ticketId: string) {
  const db = createAdmin();
  const { data: t } = await db
    .from("tickets")
    .select("id, number, subject, pending_email")
    .eq("id", ticketId)
    .is("client_id", null)
    .maybeSingle();
  if (!t?.pending_email) throw new Error("This ticket is not waiting for approval.");
  return { db, t: t as { id: string; number: number; subject: string; pending_email: string } };
}

export async function approvePendingTicket(ticketId: string): Promise<void> {
  await requireAdmin();
  const { db, t } = await loadPending(ticketId);
  const email = t.pending_email.toLowerCase();

  const { data: existing } = await db.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (existing && existing.role !== "client") throw new Error("That address belongs to an admin.");

  let clientId = existing?.id as string | undefined;
  if (!clientId) {
    // New sender: invite them. The signup trigger creates a 'client' profile;
    // the invite link lets them set a password and see this ticket.
    const { data, error } = await db.auth.admin.inviteUserByEmail(email);
    if (error || !data.user) throw new Error(error?.message ?? "Invite failed.");
    clientId = data.user.id;
  }

  const { error } = await db
    .from("tickets")
    .update({ client_id: clientId, pending_email: null })
    .eq("id", t.id)
    .is("client_id", null);
  if (error) throw new Error(error.message);
  await db.from("inbound_emails").update({ status: "created", reason: "approved by admin" }).eq("ticket_id", t.id);

  await notifyEmailTicketCreated({ to: email, ticketId: t.id, ticketNumber: t.number, subject: t.subject });

  revalidatePath(`/tickets/${t.id}`);
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
}

export async function rejectPendingTicket(ticketId: string): Promise<void> {
  await requireAdmin();
  const { db, t } = await loadPending(ticketId);
  // Log first: deleting the ticket nulls inbound_emails.ticket_id.
  await db.from("inbound_emails").update({ status: "ignored", reason: "rejected by admin" }).eq("ticket_id", t.id);
  const { error } = await db.from("tickets").delete().eq("id", t.id).is("client_id", null);
  if (error) throw new Error(error.message);

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  redirect("/tickets");
}
