import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the link Supabase emails for password recovery (and any other
// code-based auth redirect). Exchanges the one-time `code` for a session
// cookie, then forwards to `next` (defaults to /tickets).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/tickets";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/tickets";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // No code, or exchange failed — send them to login with a hint.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
