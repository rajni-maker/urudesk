"use client";

import { useActionState } from "react";
import { Check, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { updatePassword, type ResetState } from "@/app/auth/actions";
import AuthHero, { LOGIN_CARDS } from "@/components/auth/AuthHero";
import Field from "@/components/auth/AuthField";
import "@/components/auth/auth.css";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    updatePassword,
    null,
  );

  return (
    <main className="grid min-h-screen grid-cols-1 font-[family-name:var(--font-inter)] lg:grid-cols-[1.05fr_1fr]">
      <AuthHero
        headline={
          <>
            One new password
            <br />
            and you&apos;re back
          </>
        }
        subcopy="Pick something you'll remember. You'll stay signed in on this device afterwards."
        cards={LOGIN_CARDS}
      />

      {/* ================= Form panel ================= */}
      <div className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5 py-10 sm:px-8 md:bg-white dark:bg-[#0B1020]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(124,58,237,0.10),transparent_70%)] lg:hidden dark:bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(124,58,237,0.25),transparent_70%)]" />

        <div className="ps-rise relative w-full max-w-[440px]">
          {/* Wordmark — shown only when the hero is hidden */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="ps-logo-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#06B6D4]">
              <Sparkles className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </span>
            <span className="text-lg font-extrabold tracking-[-0.02em] text-[#0F172A] dark:text-white">
              UruDesk
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[#0F172A] sm:text-[34px] dark:text-white">
              Choose a new password
            </h1>
            <p className="mt-2.5 text-[15px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              Enter a new password for your account.
            </p>
          </div>

          <form action={formAction} className="space-y-[18px]">
            <Field
              label="New password"
              name="password"
              type="password"
              placeholder="At least 6 characters"
              icon={Lock}
              autoComplete="new-password"
              required
            />

            {state && "error" in state && (
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
              disabled={pending}
              className="ps-cta mt-1 flex h-[54px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-[#4F46E5]/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1020]"
            >
              {pending ? (
                <>
                  <span className="ps-spinner h-[18px] w-[18px]" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-[18px] w-[18px]" strokeWidth={2.4} />
                  Save new password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
