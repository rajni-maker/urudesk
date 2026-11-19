// Pure helpers for the inbound-email webhook (no I/O, unit-tested).
import { createHmac, timingSafeEqual } from "node:crypto";

// Resend signs webhooks with Svix: HMAC-SHA256 over "id.timestamp.body",
// keyed with the base64 part of the "whsec_..." secret. The signature header
// holds one or more space-separated "v1,<base64>" entries.
export function verifyWebhook(
  secret: string,
  h: { id: string | null; timestamp: string | null; signature: string | null },
  rawBody: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!secret || !h.id || !h.timestamp || !h.signature) return false;
  const ts = Number(h.timestamp);
  // Reject replays older/newer than 5 minutes.
  if (!Number.isFinite(ts) || Math.abs(nowSec - ts) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${h.id}.${h.timestamp}.${rawBody}`)
    .digest();

  return h.signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

// "Biplop <Biplop@XYZ.com>" -> "biplop@xyz.com". Null if there is no address.
export function parseAddress(from: string | null | undefined): string | null {
  if (!from) return null;
  const m = from.match(/<([^<>\s]+@[^<>\s]+)>/) ?? from.match(/([^\s<>"]+@[^\s<>"]+)/);
  return m ? m[1].toLowerCase() : null;
}

// Out-of-office, bounces and list mail must never become tickets (and must
// never get an acknowledgement back, or two auto-responders loop forever).
export function isAutomated(
  headers: Record<string, string | undefined> | null | undefined,
  fromAddr: string,
): boolean {
  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers ?? {})) h[k.toLowerCase()] = String(v ?? "").toLowerCase();

  if (h["auto-submitted"] && h["auto-submitted"] !== "no") return true;
  if (/^(bulk|junk|list|auto_reply)$/.test(h["precedence"] ?? "")) return true;
  if ("x-autoreply" in h || "x-autorespond" in h || "x-auto-response-suppress" in h) return true;
  if ("list-id" in h || "list-unsubscribe" in h) return true;
  return /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply)@/.test(fromAddr);
}

// Plain text for the ticket body. Prefer the text part; fall back to a crude
// HTML strip. Stored as text and rendered escaped, so no HTML reaches the UI.
export function bodyText(text: string | null | undefined, html: string | null | undefined): string {
  let out = (text ?? "").trim();
  if (!out && html) {
    out = html
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return out.slice(0, 20000);
}

// Senders whose mail passed DKIM or DMARC really own their address. SPF alone
// only vouches for the envelope sender, which a spoofer controls.
export function senderAuthenticated(
  auth: { spf?: string; dkim?: string; dmarc?: string } | null | undefined,
): boolean {
  return auth?.dmarc === "pass" || auth?.dkim === "pass";
}

// "Re: [#12] New reply: Printer down" -> 12. Null when there is no tag.
export function ticketNumberFromSubject(subject: string | null | undefined): number | null {
  const m = (subject ?? "").match(/\[#(\d{1,9})\]/);
  return m ? Number(m[1]) : null;
}

// Keep only the new text of an emailed reply: cut at the "On ... wrote:" line
// (Gmail may wrap it over two lines) or an Outlook header block, and drop any
// leftover "> " quoted lines.
export function stripQuotedReply(body: string): string {
  const cut = body.search(/^On [^\n]*(\n[^\n]*)?wrote:\s*$|^-{2,}\s*Original Message\s*-{2,}|^From: .*\n(Sent|Date): /im);
  const head = cut >= 0 ? body.slice(0, cut) : body;
  return head
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n")
    .trim();
}
