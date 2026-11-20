"use client";

import { useActionState } from "react";
import { updateMyContact, type ContactState } from "./actions";

export default function ContactForm({ phone, phone2 }: { phone: string; phone2: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(updateMyContact, null);

  return (
    <form action={action} className="co-form">
      <label className="co-field">
        <span className="co-label">Phone number</span>
        <input name="phone" type="tel" defaultValue={phone} required maxLength={30}
          autoComplete="tel" placeholder="+91 98765 43210" className="nt-input" />
      </label>
      <label className="co-field">
        <span className="co-label">
          Second phone number <span className="co-opt">optional</span>
        </span>
        <input name="phone2" type="tel" defaultValue={phone2} maxLength={30}
          autoComplete="tel" placeholder="Another number" className="nt-input" />
      </label>
      <div className="co-actions">
        <button type="submit" disabled={pending} className="nt-submit">
          {pending ? "Saving…" : "Save numbers"}
        </button>
        {state && (
          <p role={"error" in state ? "alert" : "status"} className={"error" in state ? "co-err" : "co-ok"}>
            {"error" in state ? state.error : state.success}
          </p>
        )}
      </div>
    </form>
  );
}
