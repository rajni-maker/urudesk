// Phase 1 has two roles: the internal support team and their clients.
// Import-free so `node --test` can load it directly.

export type UserRole = "admin" | "client";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Internal Admin",
  client: "Client",
};

export function isUserRole(v: unknown): v is UserRole {
  return v === "admin" || v === "client";
}

export function isAdmin(role?: string | null): boolean {
  return role === "admin";
}

export function roleLabel(role?: string | null): string {
  return isUserRole(role) ? ROLE_LABELS[role] : "Member";
}

// ---- Phase 2 shims: lib/ai.ts (parked, not wired) imports these. ----------
export const isInternal = isAdmin;
export type DraftPerspective = "client" | "support";
export function draftPerspective(role?: string | null): DraftPerspective {
  return isAdmin(role) ? "support" : "client";
}
