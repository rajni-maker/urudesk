// Resend inbound webhook: an email from a registered, verified client to the
// support address becomes a ticket owned by that client.
//
// Safety rules:
// - Signature checked (RESEND_WEBHOOK_SECRET) before anything else.
// - inbound_emails.resend_email_id is unique, so retries never duplicate.
// - Unknown / unverified / spoofed senders are HELD (logged, no ticket, no reply).
// - Auto-replies and bounces are IGNORED (no reply, so no mail loops).
// - Logs carry ids and outcomes only, never email content.
import { NextResponse, type NextRequest } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { bodyText, isAutomated, parseAddress, senderAuthenticated, verifyWebhook } from "@/lib/inbound";
import { notifyEmailTicketCreated, notifyNewTicket } from "@/lib/email";
import { slackNewTicket } from "@/lib/slack";
import { PRIORITY_LABELS } from "@/lib/tickets";

type ReceivedEmail = {
  from?: string;
  subject?: string;
  text?: string | null;
  html?: string | null;
  headers?: Record<string, string>;
  authentication?: { spf?: string; dkim?: string; dmarc?: string } | null;
};

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[inbound] RESEND_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const raw = await request.text();
  const ok = verifyWebhook(
    secret,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    raw,
  );
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const event = JSON.parse(raw) as { type?: string; data?: { email_id?: string; from?: string; subject?: string } };
  if (event.type !== "email.received") return NextResponse.json({ ignored: event.type });

  const emailId = event.data?.email_id;
  if (!emailId) return NextResponse.json({ error: "missing email_id" }, { status: 400 });

  const db = createAdmin();

  // Claim this email. A duplicate delivery hits the unique key and stops here,
  // unless the earlier attempt failed, in which case we take it over once.
  const { error: claimError } = await db.from("inbound_emails").insert({
    resend_email_id: emailId,
    from_email: parseAddress(event.data?.from) ?? "",
    subject: String(event.data?.subject ?? "").slice(0, 200),
  });
  if (claimError) {
    if (claimError.code !== "23505") throw claimError;
    const { data: retry } = await db
      .from("inbound_emails")
      .update({ status: "processing", reason: null })
      .eq("resend_email_id", emailId)
      .eq("status", "failed")
      .select("id");
    if (!retry?.length) return NextResponse.json({ duplicate: true });
  }

  const finish = (status: "created" | "held" | "ignored" | "failed", reason?: string, ticketId?: string) =>
    db
      .from("inbound_emails")
      .update({ status, reason: reason ?? null, ticket_id: ticketId ?? null })
      .eq("resend_email_id", emailId);

  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!res.ok) throw new Error(`Resend receiving API ${res.status}`);
    const email = (await res.json()) as ReceivedEmail;

    const fromAddr = parseAddress(email.from);
    if (!fromAddr) return hold("no sender address");
    if (isAutomated(email.headers, fromAddr)) {
      await finish("ignored", "automated message");
      return NextResponse.json({ outcome: "ignored" });
    }

    const { data: profile } = await db
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("email", fromAddr)
      .maybeSingle();
    if (!profile || profile.role !== "client") return hold("sender is not a registered client");

    const { data: authUser } = await db.auth.admin.getUserById(profile.id);
    if (!authUser.user?.email_confirmed_at) return hold("sender email not verified");

    if (!senderAuthenticated(email.authentication)) {
      return hold("sender failed DKIM/DMARC (possible spoof)");
    }

    const subject = (email.subject ?? "").trim().slice(0, 200) || "(no subject)";
    const body = bodyText(email.text, email.html) || "(empty email)";

    const { data: ticket, error } = await db
      .from("tickets")
      .insert({ subject, body, priority: "normal", client_id: profile.id, source: "email" })
      .select("id, number")
      .single();
    if (error || !ticket) throw error ?? new Error("ticket insert returned nothing");
    await finish("created", undefined, ticket.id);

    // Same notifications as a portal ticket, plus an acknowledgement to the client.
    const { data: admins } = await db.from("profiles").select("email").eq("role", "admin");
    await Promise.all([
      slackNewTicket({
        ticketId: ticket.id,
        subject,
        priority: PRIORITY_LABELS.normal,
        createdBy: profile.full_name || profile.email,
      }),
      notifyNewTicket({
        to: (admins ?? []).map((a) => a.email).filter(Boolean),
        ticketId: ticket.id,
        subject,
      }),
      notifyEmailTicketCreated({
        to: profile.email,
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        subject,
      }),
    ]);

    console.log(`[inbound] ${emailId} -> ticket #${ticket.number}`);
    return NextResponse.json({ outcome: "created", ticket: ticket.number });
  } catch (err) {
    console.error(`[inbound] ${emailId} failed:`, err instanceof Error ? err.message : "unknown error");
    await finish("failed", "processing error");
    // 500 makes Resend retry; the retry takes over this 'failed' row.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  async function hold(reason: string) {
    await finish("held", reason);
    console.warn(`[inbound] ${emailId} held: ${reason}`);
    return NextResponse.json({ outcome: "held" });
  }
}
