"use client";

import { useTransition } from "react";
import { deleteMember } from "./actions";

export default function DeleteButton({ userId, label }: { userId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Delete ${label}? This removes their account and all their tickets. It can't be undone.`)) return;
        start(async () => {
          const res = await deleteMember(userId);
          if (res?.error) alert(res.error);
        });
      }}
      className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-[#f87171] hover:bg-[#f87171]/10 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
