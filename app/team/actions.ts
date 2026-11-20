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
  if (error || !data.user) return { error: inviteErrorMessage(error) };

  const { error: roleError } = await admin.from("profiles").update({ role: "admin", company_id: null }).eq("id", data.user.id);
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

// Supabase Auth sometimes fails with no readable body (the message comes back
// as "{}"), typically when its outgoing SMTP times out. Never show that raw.
function inviteErrorMessage(error: { message?: string; status?: number; code?: string } | null): string {
  console.error("inviteUserByEmail failed", error);
  const msg = (error?.message ?? "").trim();
  if (error?.status === 422 || /already been registered|already exists/i.test(msg)) {
    return "That email already has an UruDesk account.";
  }
  if (error?.status === 429 || /rate limit/i.test(msg)) {
    return "Too many emails sent recently. Wait a few minutes and try again.";
  }
  if (/sending|smtp|email/i.test(msg) || !msg || msg === "{}" || (error?.status ?? 0) >= 500) {
    return "The invite email couldn't be sent. Check the SMTP settings in Supabase (Authentication → Emails → SMTP Settings) and try again.";
  }
  return msg;
}
