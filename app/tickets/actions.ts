"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile, requireAdmin, displayName } from "@/lib/session";
import {
  autoStatusOnAssign,
  isPriority,
  isStatus,
  STATUS_LABELS,
  PRIORITY_LABELS,
  type TicketStatus,
} from "@/lib/tickets";
import { slackNewTicket, slackTicketAssigned } from "@/lib/slack";
import { notifyNewTicket, notifyNewReply, notifyStatusChange } from "@/lib/email";

export type TicketFormState = { error: string } | null;

export async function createTicket(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const { supabase, profile } = await requireProfile();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");

  if (!subject || !body) return { error: "Subject and description are required." };
  if (!isPriority(priority)) return { error: "Pick a valid priority." };

  // Admins raise tickets on a client's behalf; clients always raise their own.
  const clientId =
    profile.role === "admin" ? String(formData.get("clientId") ?? "") : profile.id;
  if (!clientId) return { error: "Pick the client this ticket is for." };

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({ subject, body, priority, client_id: clientId })
    .select("id")
    .single();
  if (error || !ticket) return { error: error?.message ?? "Could not create the ticket." };

  // Admin profiles are readable by every signed-in user (RLS), so this works for clients too.
  const { data: admins } = await supabase.from("profiles").select("email").eq("role", "admin");
  await Promise.all([
    slackNewTicket({
      ticketId: ticket.id,
      subject,
      priority: PRIORITY_LABELS[priority],
      createdBy: displayName(profile),
    }),
    notifyNewTicket({
      to: (admins ?? []).map((a) => a.email).filter(Boolean),
      ticketId: ticket.id,
      subject,
    }),
  ]);

  revalidatePath("/tickets");
  redirect(`/tickets/${ticket.id}`);
}

type TicketForUpdate = {
  id: string;
  subject: string;
  status: TicketStatus;
  assignee_id: string | null;
  client: { email: string } | null;
  assignee: { full_name: string; email: string } | null;
};

async function loadTicket(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  ticketId: string,
): Promise<TicketForUpdate> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, subject, status, assignee_id, client:profiles!tickets_client_id_fkey(email), assignee:profiles!tickets_assignee_id_fkey(full_name, email)",
    )
    .eq("id", ticketId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Ticket not found.");
  return data as unknown as TicketForUpdate;
}

function emailClientStatus(t: TicketForUpdate, status: TicketStatus) {
  return notifyStatusChange({
    to: t.client?.email ? [t.client.email] : [],
    ticketId: t.id,
    subject: t.subject,
    statusLabel: STATUS_LABELS[status],
  });
}

export async function addReply(ticketId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { error } = await supabase
    .from("ticket_replies")
    .insert({ ticket_id: ticketId, author_id: profile.id, body });
  if (error) throw new Error(error.message);

  // Only admin replies notify (the client, by email).
  if (profile.role === "admin") {
    const t = await loadTicket(supabase, ticketId);
    await notifyNewReply({
      to: t.client?.email ? [t.client.email] : [],
      ticketId,
      subject: t.subject,
      fromLabel: displayName(profile),
    });
  }
  revalidatePath(`/tickets/${ticketId}`);
}

export async function changeStatus(ticketId: string, formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const status = formData.get("status");
  if (!isStatus(status)) return;

  const t = await loadTicket(supabase, ticketId);
  if (t.status === status) return;

  const { error } = await supabase.from("tickets").update({ status }).eq("id", ticketId);
  if (error) throw new Error(error.message);
  await supabase.from("ticket_events").insert({
    ticket_id: ticketId,
    actor_id: profile.id,
    kind: "status",
    from_value: t.status,
    to_value: status,
  });
  await emailClientStatus(t, status);
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

export async function changePriority(ticketId: string, formData: FormData) {
  const { supabase } = await requireAdmin();
  const priority = formData.get("priority");
  if (!isPriority(priority)) return;

  const { error } = await supabase.from("tickets").update({ priority }).eq("id", ticketId);
  if (error) throw new Error(error.message);
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

export async function assignTicket(ticketId: string, formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;

  const t = await loadTicket(supabase, ticketId);
  if (t.assignee_id === assigneeId) return;
  let assigneeName = "Unassigned";
  if (assigneeId) {
    const { data: a } = await supabase
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", assigneeId)
      .single();
    if (!a || a.role !== "admin") throw new Error("Tickets can only be assigned to admins.");
    assigneeName = displayName(a);
  }
  const fromName = t.assignee ? displayName(t.assignee) : "Unassigned";

  const nextStatus = autoStatusOnAssign(t.status, assigneeId);
  const { error } = await supabase
    .from("tickets")
    .update({ assignee_id: assigneeId, ...(nextStatus ? { status: nextStatus } : {}) })
    .eq("id", ticketId);
  if (error) throw new Error(error.message);

  await supabase.from("ticket_events").insert([
    { ticket_id: ticketId, actor_id: profile.id, kind: "assign", from_value: fromName, to_value: assigneeName },
    ...(nextStatus
      ? [{ ticket_id: ticketId, actor_id: profile.id, kind: "status", from_value: t.status, to_value: nextStatus }]
      : []),
  ]);

  if (assigneeId) {
    await slackTicketAssigned({
      ticketId,
      subject: t.subject,
      assigneeName,
      assignedByName: displayName(profile),
    });
  }
  if (nextStatus) await emailClientStatus(t, nextStatus);

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}
