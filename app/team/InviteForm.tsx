"use client";

import { useActionState } from "react";
import { inviteMember, type InviteState } from "./actions";

export default function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, null);
  return (
    <form action={action} className="psd-card flex flex-wrap items-end gap-3 rounded-2xl p-5">
      <label className="flex flex-1 flex-col gap-2 text-[13px] font-semibold text-[#a0a0b8]">
        Email
        <input name="email" type="email" required className="psd-input rounded-xl px-4 py-2.5 text-[15px] text-[#f0f0f5]" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send invite"}
      </button>
      {state && "error" in state && <p role="alert" className="w-full text-sm text-[#f87171]">{state.error}</p>}
      {state && "success" in state && <p className="w-full text-sm text-[#4ade80]">{state.success}</p>}
    </form>
  );
}
