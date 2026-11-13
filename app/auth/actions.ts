"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Shape of what these actions return to the form when something goes wrong.
export type AuthState = { error: string } | null;

// Reset flows also report a success message.
export type ResetState = { error: string } | { success: string } | null;

// Public signup. The DB trigger always creates a 'client' profile; admins come from /team invites.
export async function signUp(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/tickets`,
    },
  });

  if (error) return { error: error.message };

  // "Confirm email" is on: no session until they click the link.
  if (!data.session) {
    return { success: "Check your email to confirm your account." };
  }

  redirect("/tickets");
}

// Log an existing user in.
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/tickets");
}

// Log the current user out.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Step 1 of password recovery: email the user a reset link. The link points at
// our /auth/callback route, which exchanges the code for a session and forwards
// to /reset-password. We always report success so we don't reveal which emails
// are registered.
export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  // Build an absolute origin that works on both localhost and the deployed URL.
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  return {
    success:
      "If that email is registered, we've sent a password reset link. Check your inbox.",
  };
}

// Step 2 of password recovery: the user is now on /reset-password with a
// recovery session (set by /auth/callback). Save their new password.
export async function updatePassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Your reset link has expired. Request a new one from the login page.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/tickets");
}
