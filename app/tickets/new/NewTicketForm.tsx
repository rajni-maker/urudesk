"use client";

import { useActionState } from "react";
import { createTicket, type TicketFormState } from "../actions";
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from "@/lib/tickets";

export default function NewTicketForm({
  clients,
}: {
  /* Present only for admins: who the ticket is for. */
  clients?: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<TicketFormState, FormData>(createTicket, null);

  return (
    <form action={action} className="psd-card flex max-w-2xl flex-col gap-5 rounded-2xl p-6">
      {clients && (
        <label className="flex flex-col gap-2 text-[13px] font-semibold text-[#a0a0b8]">
          Client
          <select name="clientId" required className="psd-select" defaultValue="">
            <option value="" disabled>Choose a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[#a0a0b8]">
        Subject
        <input name="subject" required maxLength={200} className="psd-input rounded-xl px-4 py-3 text-[15px] text-[#f0f0f5]" />
      </label>
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[#a0a0b8]">
        Description
        <textarea name="body" required rows={6} className="psd-input rounded-xl px-4 py-3 text-[15px] text-[#f0f0f5]" />
      </label>
      <label className="flex flex-col gap-2 text-[13px] font-semibold text-[#a0a0b8]">
        Priority
        <select name="priority" defaultValue="normal" className="psd-select">
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </label>
      {state?.error && <p role="alert" className="text-sm text-[#f87171]">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create ticket"}
      </button>
    </form>
  );
}
