import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request so Server Components
// always see a valid session, and guards routes (signed-out and non-admin).
// Next.js 16 renamed the "middleware" convention to "proxy".
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not configured yet (no Supabase keys in .env.local) — do nothing so the
  // app still runs. Remove-able once env vars are set; the guard is harmless.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: touch getUser() to trigger the session refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const under = (prefixes: string[]) =>
    prefixes.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !under(PUBLIC_PATHS)) return redirectKeepingCookies(request, response, "/login");

  if (user && under(ADMIN_PATHS)) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (data?.role !== "admin") return redirectKeepingCookies(request, response, "/tickets");
  }

  return response;
}

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth"];
const ADMIN_PATHS = ["/dashboard", "/team"];

// A redirect must carry any cookies the session refresh just set.
function redirectKeepingCookies(request: NextRequest, response: NextResponse, to: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  // Run on all routes except static assets and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
