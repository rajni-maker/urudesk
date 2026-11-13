// Slack notifications via an incoming webhook (no SDK dependency).
//
// Best-effort and self-guarding, exactly like lib/email.ts: if
// SLACK_WEBHOOK_URL is unset the functions are silent no-ops, and network
// errors are swallowed. A Slack outage must never break a ticket action.
//
// Only two events post here, by design:
//   1. a new ticket is created
//   2. a ticket is assigned
// Admins troubleshoot together by threading on the alert and @-mentioning
// each other in Slack itself.
// Internal replies and status changes stay in email only, to keep the channel
// signal-heavy.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type Block = Record<string, unknown>;

async function post(text: string, blocks: Block[]) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `text` is the notification/fallback string shown in the sidebar and
      // on mobile push; `blocks` render the formatted message in-channel.
      body: JSON.stringify({ text, blocks }),
    });
    // Slack replies "ok" on success and a plain-text reason on failure
    // (invalid_payload, channel_not_found, ...). Log it rather than swallow.
    if (!res.ok) {
      console.error(`[slack] ${res.status}:`, (await res.text()).slice(0, 200));
    }
  } catch (err) {
    // best-effort — never surface Slack failures to the user
    console.error("[slack] network error:", err);
  }
}

// Slack's mrkdwn treats these three characters specially, so escape any text
// that came from a user (ticket subjects, names, reply bodies).
function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
  );
}

// Shared message shape: a headline, optional context lines, and a button
// through to the ticket.
function build(
  headline: string,
  fields: { label: string; value: string }[],
  path: string,
  buttonLabel: string,
): Block[] {
  const blocks: Block[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${headline}*` },
    },
  ];

  if (fields.length) {
    blocks.push({
      type: "section",
      fields: fields.map((f) => ({
        type: "mrkdwn",
        text: `*${f.label}*\n${f.value}`,
      })),
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: buttonLabel, emoji: true },
        url: `${SITE_URL}${path}`,
      },
    ],
  });

  return blocks;
}

// ---- 1. New ticket created ------------------------------------------------

export async function slackNewTicket(opts: {
  ticketId: string;
  subject: string;
  priority: string;
  createdBy: string;
}) {
  const subject = esc(opts.subject);
  await post(
    `New ticket: ${subject}`,
    build(
      `🎫 New ticket — ${subject}`,
      [
        { label: "Priority", value: esc(opts.priority) },
        { label: "Raised by", value: esc(opts.createdBy) },
      ],
      `/tickets/${opts.ticketId}`,
      "Open ticket",
    ),
  );
}

// ---- 2. Ticket assigned to a support rep ----------------------------------

export async function slackTicketAssigned(opts: {
  ticketId: string;
  subject: string;
  assigneeName: string;
  assignedByName: string;
}) {
  const subject = esc(opts.subject);
  await post(
    `${esc(opts.assigneeName)} was assigned: ${subject}`,
    build(
      `👤 Ticket assigned — ${subject}`,
      [
        { label: "Assigned to", value: esc(opts.assigneeName) },
        { label: "Assigned by", value: esc(opts.assignedByName) },
      ],
      `/tickets/${opts.ticketId}`,
      "Open ticket",
    ),
  );
}
