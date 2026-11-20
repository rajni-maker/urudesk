"use client";

import { useActionState, useState } from "react";
import { updateTicketSettings, type SettingsState } from "@/app/tickets/actions";

type Option = { value: string; label: string };

type Props = {
  ticketId: string;
  status: string;
  priority: string;
  assigneeId: string;
  statusOptions: Option[];
  priorityOptions: Option[];
  assigneeOptions: Option[];
};

/** Status, priority and assignee in one form with a single Save button that
 * only wakes up once something has actually changed. */
export default function TicketSettings(props: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateTicketSettings.bind(null, props.ticketId),
    null,
  );
  const [status, setStatus] = useState(props.status);
  const [priority, setPriority] = useState(props.priority);
  const [assigneeId, setAssigneeId] = useState(props.assigneeId);

  // After a save the page re-renders with the new values; follow them so the
  // form is "clean" again. (Adjusting state during render, per React docs.)
  const [synced, setSynced] = useState(props);
  if (synced.status !== props.status || synced.priority !== props.priority || synced.assigneeId !== props.assigneeId) {
    setSynced(props);
    setStatus(props.status);
    setPriority(props.priority);
    setAssigneeId(props.assigneeId);
  }

  const dirty = status !== props.status || priority !== props.priority || assigneeId !== props.assigneeId;

  const select = (
    id: string,
    label: string,
    name: string,
    value: string,
    set: (v: string) => void,
    options: Option[],
  ) => (
    <label className="ts-field" htmlFor={id}>
      <span className="ts-label">{label}</span>
      <select id={id} name={name} value={value} onChange={(e) => set(e.target.value)} className="nt-input psd-select ts-select">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <form action={action} className="ts-card">
      <h2 className="ts-title">Ticket settings</h2>
      <input type="hidden" name="origStatus" value={props.status} />
      <input type="hidden" name="origPriority" value={props.priority} />
      <input type="hidden" name="origAssigneeId" value={props.assigneeId} />
      {select("ts-status", "Status", "status", status, setStatus, props.statusOptions)}
      {select("ts-priority", "Priority", "priority", priority, setPriority, props.priorityOptions)}
      {select("ts-assignee", "Assigned to", "assigneeId", assigneeId, setAssigneeId, props.assigneeOptions)}
      <button type="submit" className="nt-submit ts-save" disabled={!dirty || pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
      <p className="ts-msg" role="status" aria-live="polite">
        {state && "error" in state && <span className="ts-err">{state.error}</span>}
        {state && "saved" in state && !dirty && !pending && <span className="ts-ok">Changes saved</span>}
        {dirty && !pending && <span className="ts-hint">You have unsaved changes</span>}
      </p>
    </form>
  );
}
