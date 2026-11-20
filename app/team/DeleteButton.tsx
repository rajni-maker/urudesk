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
        if (!confirm(`Remove ${label} from the team? Their account and every reply they wrote on tickets will be deleted. This can't be undone.`)) return;
        start(async () => {
          const res = await deleteMember(userId);
          if (res?.error) alert(res.error);
        });
      }}
      className="tm-remove"
      aria-label={`Remove ${label}`}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
