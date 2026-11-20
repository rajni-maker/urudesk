"use client";

import { useActionState } from "react";
import { inviteMember, type InviteState } from "./actions";

export default function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, null);
  return (
    <form action={action}>
      <div className="tm-invite-form">
        <label htmlFor="invite-email" className="sr-only">Email address</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="name@dreamnotion.com"
          className="nt-input"
        />
        <button type="submit" disabled={pending} className="nt-submit">
          {pending ? "Sending…" : "Send invite"}
        </button>
      </div>
      {state && "error" in state && <p role="alert" className="tm-msg tm-msg-err">{state.error}</p>}
      {state && "success" in state && <p role="status" className="tm-msg tm-msg-ok">{state.success}</p>}
    </form>
  );
}
