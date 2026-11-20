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
import { createAdmin } from "@/lib/supabase/admin";
import { sanitizeTicketHtml, MAX_BODY_HTML } from "@/lib/richtext";
import {
  ALLOWED_TYPES,
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENTS,
  checkAttachment,
  extensionOf,
  ownsUploadPath,
  sniffMime,
} from "@/lib/attachments";
import { randomUUID } from "node:crypto";

export type TicketFormState =
  | { error: string; field?: "subject" | "body" | "attachments" | "clientId" }
  | null;

type UploadedFile = { path: string; name: string };

export async function createTicket(
  _prev: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const { supabase, profile } = await requireProfile();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const rawHtml = String(formData.get("bodyHtml") ?? "");
  const priority = String(formData.get("priority") ?? "normal");

  if (!subject) return { error: "Enter a subject.", field: "subject" };
  if (subject.length > 200) return { error: "Keep the subject under 200 characters.", field: "subject" };
  if (!body) return { error: "Describe the issue.", field: "body" };
  if (!isPriority(priority)) return { error: "Pick a valid priority." };
  const bodyHtml = rawHtml ? sanitizeTicketHtml(rawHtml) : null;
  if (bodyHtml && bodyHtml.length > MAX_BODY_HTML) return { error: "The description is too long.", field: "body" };

  // Admins raise tickets on a client's behalf; clients always raise their own.
  const clientId =
    profile.role === "admin" ? String(formData.get("clientId") ?? "") : profile.id;
  if (!clientId) return { error: "Pick the client this ticket is for.", field: "clientId" };

  // Uploads already sit in storage (via signed upload URLs). Check each is the
  // caller's own, within limits, and really the type its name claims.
  let uploads: UploadedFile[];
  try {
    uploads = JSON.parse(String(formData.get("attachments") || "[]"));
    if (!Array.isArray(uploads)) throw new Error();
  } catch {
    return { error: "The attachment list was malformed.", field: "attachments" };
  }
  if (uploads.length > MAX_ATTACHMENTS) return { error: `Attach at most ${MAX_ATTACHMENTS} files.`, field: "attachments" };
  const admin = createAdmin();
  const verified: { storage_path: string; file_name: string; mime_type: string; size_bytes: number }[] = [];
  for (const u of uploads) {
    const name = typeof u?.name === "string" ? u.name.slice(0, 255) : "";
    if (!name || typeof u.path !== "string" || !ownsUploadPath(u.path, profile.id))
      return { error: "One of the attachments is invalid. Remove it and try again.", field: "attachments" };
    // ponytail: downloads the whole file (≤10 MB) to sniff 4 KB; switch to a Range request if limits grow.
    const { data: blob } = await admin.storage.from(ATTACHMENT_BUCKET).download(u.path);
    if (!blob) return { error: `${name} didn't finish uploading. Remove it and attach it again.`, field: "attachments" };
    const problem = checkAttachment(name, blob.size);
    if (problem) return { error: problem, field: "attachments" };
    const mime = sniffMime(new Uint8Array(await blob.slice(0, 4096).arrayBuffer()), name);
    if (!mime)
      return { error: `${name} doesn't look like a valid ${extensionOf(name).toUpperCase()} file.`, field: "attachments" };
    verified.push({ storage_path: u.path, file_name: name, mime_type: mime, size_bytes: blob.size });
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({ subject, body, body_html: bodyHtml, priority, client_id: clientId })
    .select("id")
    .single();
  if (error || !ticket) return { error: error?.message ?? "Could not create the ticket." };

  let attachmentsFailed = false;
  if (verified.length) {
    const { error: attachError } = await admin
      .from("ticket_attachments")
      .insert(verified.map((v) => ({ ...v, ticket_id: ticket.id, uploaded_by: profile.id })));
    attachmentsFailed = !!attachError;
  }

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
  redirect(`/tickets/${ticket.id}?created=1${attachmentsFailed ? "&attachments=failed" : ""}`);
}

/** Issue a one-off signed upload URL inside the caller's own storage folder. */
export async function prepareAttachmentUpload(
  name: string,
  size: number,
): Promise<{ error: string } | { path: string; signedUrl: string; contentType: string }> {
  const { profile } = await requireProfile();
  const problem = checkAttachment(String(name), Number(size));
  if (problem) return { error: problem };
  const ext = extensionOf(name);
  const path = `${profile.id}/${randomUUID()}.${ext}`;
  // ponytail: no per-user rate limit, and abandoned uploads stay in the bucket until a cleanup job exists.
  const { data, error } = await createAdmin().storage.from(ATTACHMENT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Uploads are unavailable right now. Try again shortly." };
  return { path, signedUrl: data.signedUrl, contentType: ALLOWED_TYPES[ext] };
}

/** Delete an upload the user removed before submitting. Files already linked to a ticket are kept. */
export async function discardAttachmentUpload(path: string): Promise<void> {
  const { profile } = await requireProfile();
  if (!ownsUploadPath(String(path), profile.id)) return;
  const admin = createAdmin();
  const { data: linked } = await admin.from("ticket_attachments").select("id").eq("storage_path", path).maybeSingle();
  if (!linked) await admin.storage.from(ATTACHMENT_BUCKET).remove([path]);
}

type TicketForUpdate = {
  id: string;
  number: number;
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
      "id, number, subject, status, assignee_id, client:profiles!tickets_client_id_fkey(email), assignee:profiles!tickets_assignee_id_fkey(full_name, email)",
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
    ticketNumber: t.number,
    subject: t.subject,
    statusLabel: STATUS_LABELS[status],
  });
}

export async function addReply(ticketId: string, formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const rawHtml = String(formData.get("bodyHtml") ?? "");
  const bodyHtml = rawHtml ? sanitizeTicketHtml(rawHtml) : null;
  if (bodyHtml && bodyHtml.length > MAX_BODY_HTML) throw new Error("Reply is too long.");

  const { error } = await supabase
    .from("ticket_replies")
    .insert({ ticket_id: ticketId, author_id: profile.id, body, body_html: bodyHtml });
  if (error) throw new Error(error.message);

  // Only admin replies notify (the client, by email).
  if (profile.role === "admin") {
    const t = await loadTicket(supabase, ticketId);
    await notifyNewReply({
      to: t.client?.email ? [t.client.email] : [],
      ticketId,
      ticketNumber: t.number,
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
