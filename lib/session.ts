import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/roles";

export type Profile = { id: string; email: string; full_name: string; role: UserRole };

// Every signed-in page and action starts here. Returns the RLS-bound client
// and the caller's profile, or redirects to /login.
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  return { supabase, profile: profile as Profile };
}

// Same, but only for admins. Pages check this themselves rather than trusting
// proxy.ts alone.
export async function requireAdmin() {
  const session = await requireProfile();
  if (session.profile.role !== "admin") redirect("/tickets");
  return session;
}

export function displayName(
  p: { full_name?: string | null; email?: string | null } | null | undefined,
): string {
  return p?.full_name?.trim() || p?.email || "Unknown";
}
