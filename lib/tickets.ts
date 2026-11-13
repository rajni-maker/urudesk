// Ticket vocabulary for Phase 1: three statuses, three priorities.
// Deliberately import-free so `node --test` can load it directly.

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "normal" | "high";

export const STATUS_OPTIONS: TicketStatus[] = ["open", "in_progress", "resolved"];
export const PRIORITY_OPTIONS: TicketPriority[] = ["low", "normal", "high"];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const DARK_STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-[#6366f1]/[0.12] text-[#818cf8]",
  in_progress: "bg-[#f59e0b]/[0.12] text-[#fbbf24]",
  resolved: "bg-[#22c55e]/[0.12] text-[#4ade80]",
};

export const DARK_PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "bg-white/[0.06] text-[#a0a0b8]",
  normal: "bg-[#06b6d4]/[0.12] text-[#22d3ee]",
  high: "bg-[#ef4444]/[0.12] text-[#f87171]",
};

export function isStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && (STATUS_OPTIONS as string[]).includes(v);
}

export function isPriority(v: unknown): v is TicketPriority {
  return typeof v === "string" && (PRIORITY_OPTIONS as string[]).includes(v);
}

/**
 * Status a ticket moves to when assigned, or null to leave it. Assigning an
 * open ticket means work is starting; anything else keeps its status, and
 * unassigning never moves it.
 */
export function autoStatusOnAssign(
  current: TicketStatus,
  assigneeId: string | null,
): TicketStatus | null {
  if (!assigneeId) return null;
  return current === "open" ? "in_progress" : null;
}

type Param = string | string[] | undefined;

/** Reads `?status=&priority=` from the ticket list URL; invalid values become null. */
export function parseFilters(sp: { status?: Param; priority?: Param }): {
  status: TicketStatus | null;
  priority: TicketPriority | null;
} {
  const first = (v: Param) => (Array.isArray(v) ? v[0] : v);
  const status = first(sp.status);
  const priority = first(sp.priority);
  return {
    status: isStatus(status) ? status : null,
    priority: isPriority(priority) ? priority : null,
  };
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}
