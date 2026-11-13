"use server";

import { revalidatePath } from "next/cache";
import { createAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/session";

export type InviteState = { error: string } | { success: string } | null;

// Admin-only. The Team page invites internal staff, so every invitee is an
// admin. Clients sign themselves up via /signup. Supabase emails the invite;
// the trigger creates a 'client' profile, which we promote here.
export async function inviteMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const admin = createAdmin();
  // The invite link itself comes from the dashboard email template (Task 1),
  // which points at /auth/confirm → /reset-password.
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { role: "admin" } });
  if (error || !data.user) return { error: error?.message ?? "Invite failed." };

  const { error: roleError } = await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
  if (roleError) return { error: `Invited, but couldn't make them an admin: ${roleError.message}` };

  revalidatePath("/team");
  return { success: `Invite sent to ${email}. They'll join as an admin.` };
}

// Admin-only. Deletes the login; FK cascades remove the profile, the user's
// tickets, and their replies/events. You can't delete yourself.
export async function deleteMember(userId: string): Promise<{ error: string } | null> {
  const { profile } = await requireAdmin();
  if (userId === profile.id) return { error: "You can't delete your own account." };

  const { error } = await createAdmin().auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/team");
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  return null;
}
