"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { signIn, type AuthState } from "@/app/auth/actions";
import AuthHero, { LOGIN_CARDS } from "@/components/auth/AuthHero";
import Field from "@/components/auth/AuthField";
import "@/components/auth/auth.css";

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signIn,
    null,
  );

  // Presentation only: when a submit finishes without an error the action is
  // redirecting to /dashboard, so hold a success state on the button until this
  // page unmounts. Never gates the form itself.
  const [succeeded, setSucceeded] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) setSucceeded(true);
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <main className="grid min-h-screen grid-cols-1 font-[family-name:var(--font-inter)] lg:grid-cols-[1.05fr_1fr]">
      <AuthHero
        headline={
          <>
            Your queue,
            <br />
            already triaged
          </>
        }
        subcopy="Pick up where you left off — tickets sorted, summaries written and replies drafted while you were away."
        cards={LOGIN_CARDS}
      />

      {/* ================= Form panel ================= */}
      <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5 py-10 sm:px-8 md:bg-white dark:bg-[#0B1020]">
        {/* Mobile-only accent: the hero is hidden below lg, so keep a hint of it */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(124,58,237,0.10),transparent_70%)] lg:hidden dark:bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(124,58,237,0.25),transparent_70%)]" />

        <div className="ps-rise relative w-full max-w-[440px]">
          {/* Wordmark — shown only when the hero is hidden */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="ps-logo-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#06B6D4]">
              <Sparkles className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </span>
            <span className="text-lg font-extrabold tracking-[-0.02em] text-[#0F172A] dark:text-white">
              PixelSupport
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[#0F172A] sm:text-[34px] dark:text-white">
              Welcome back
            </h1>
            <p className="mt-2.5 text-[15px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              Log in to your PixelSupport workspace.
            </p>
          </div>

          <form action={formAction} className="space-y-[18px]">
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="you@company.com"
              icon={Mail}
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="Your password"
              icon={Lock}
              autoComplete="current-password"
              required
              labelAccessory={
                <Link
                  href="/forgot-password"
                  className="rounded text-[12.5px] font-medium text-[#64748B] outline-none transition-colors hover:text-[#4F46E5] focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40 dark:text-[#94A3B8] dark:hover:text-[#A5B4FC]"
                >
                  Forgot password?
                </Link>
              }
            />

            {linkError && !state && (
              <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-3.5 py-3 text-[13px] font-medium text-[#BE123C] dark:border-[#4C1D24] dark:bg-[#2A1015] dark:text-[#FDA4AF]">
                <ShieldCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
                That link is invalid or has expired. Ask your admin for a new invite, or log in below.
              </p>
            )}

            {state?.error && (
              <p
                role="alert"
                className="ps-error flex items-start gap-2 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-3.5 py-3 text-[13px] font-medium text-[#BE123C] dark:border-[#4C1D24] dark:bg-[#2A1015] dark:text-[#FDA4AF]"
              >
                <ShieldCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || succeeded}
              className="ps-cta mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1020]"
            >
              {succeeded ? (
                <>
                  <span className="ps-success flex h-6 w-6 items-center justify-center rounded-full bg-white/25">
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  Signed in
                </>
              ) : pending ? (
                <>
                  <span className="ps-spinner h-[18px] w-[18px]" />
                  Logging in…
                </>
              ) : (
                <>
                  Log in
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-[#E2E8F0] pt-6 text-center text-sm text-[#64748B] dark:border-[#1E293B] dark:text-[#94A3B8]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="rounded font-semibold text-[#4F46E5] outline-none transition-colors hover:text-[#4338CA] focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40 dark:text-[#A5B4FC] dark:hover:text-[#C7D2FE]"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
