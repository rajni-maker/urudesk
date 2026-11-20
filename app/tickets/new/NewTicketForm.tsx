"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import {
  createTicket,
  discardAttachmentUpload,
  prepareAttachmentUpload,
  type TicketFormState,
} from "../actions";
import { PRIORITY_LABELS, PRIORITY_OPTIONS, type TicketPriority } from "@/lib/tickets";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  checkAttachment,
  formatBytes,
} from "@/lib/attachments";
import RichTextEditor from "@/components/tickets/RichTextEditor";

const PRIORITY_HINTS: Record<TicketPriority, string> = {
  low: "General question or minor issue",
  normal: "Something isn't working as expected",
  high: "Work is blocked or many users affected",
};

type Upload = {
  key: string;
  name: string;
  size: number;
  progress: number; // 0–100
  status: "uploading" | "done" | "error";
  error?: string;
  path?: string;
  xhr?: XMLHttpRequest;
};

/** Present only for admins: who the ticket is for. */
export default function NewTicketForm({ clients }: { clients?: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<TicketFormState, FormData>(createTicket, null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState({ subject: false, body: false });
  const fileInput = useRef<HTMLInputElement>(null);

  const patch = (key: string, p: Partial<Upload>) =>
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...p } : u)));

  async function addFiles(files: FileList | File[]) {
    const room = MAX_ATTACHMENTS - uploads.length;
    const picked = Array.from(files);
    const accepted = picked.slice(0, Math.max(room, 0));
    const overflow = picked.slice(accepted.length).map<Upload>((f) => ({
      key: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      progress: 0,
      status: "error",
      error: `Limit is ${MAX_ATTACHMENTS} files per ticket.`,
    }));
    const fresh = accepted.map<Upload & { file: File }>((f) => {
      const problem = checkAttachment(f.name, f.size);
      return {
        key: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        progress: 0,
        status: problem ? "error" : "uploading",
        error: problem ?? undefined,
        file: f,
      };
    });
    setUploads((list) => [...list, ...fresh, ...overflow]);
    await Promise.all(fresh.filter((u) => u.status === "uploading").map((u) => upload(u.key, u.file)));
  }

  async function upload(key: string, file: File) {
    const ticket = await prepareAttachmentUpload(file.name, file.size).catch(() => ({
      error: "Couldn't start the upload. Check your connection.",
    }));
    if ("error" in ticket) return patch(key, { status: "error", error: ticket.error });

    const xhr = new XMLHttpRequest();
    patch(key, { xhr, path: ticket.path });
    xhr.open("PUT", ticket.signedUrl);
    xhr.setRequestHeader("content-type", ticket.contentType);
    xhr.setRequestHeader("x-upsert", "false");
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anon) xhr.setRequestHeader("apikey", anon);
    xhr.upload.onprogress = (e) => e.lengthComputable && patch(key, { progress: Math.round((e.loaded / e.total) * 100) });
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? patch(key, { status: "done", progress: 100, xhr: undefined })
        : patch(key, { status: "error", error: "Upload failed. Remove it and try again.", xhr: undefined });
    xhr.onerror = () => patch(key, { status: "error", error: "Upload failed. Check your connection.", xhr: undefined });
    xhr.send(file);
  }

  function remove(u: Upload) {
    u.xhr?.abort();
    if (u.path) void discardAttachmentUpload(u.path);
    setUploads((list) => list.filter((x) => x.key !== u.key));
  }

  const uploading = uploads.some((u) => u.status === "uploading");
  const subjectError =
    state?.field === "subject" ? state.error : touched.subject && !subject.trim() ? "Enter a subject." : null;
  const bodyError =
    state?.field === "body" ? state.error : touched.body && !bodyText ? "Describe the issue." : null;
  const formError = state && !state.field ? state.error : null;
  const attachmentsError = state?.field === "attachments" ? state.error : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    setTouched({ subject: true, body: true });
    if (!subject.trim() || !bodyText || uploading) {
      e.preventDefault();
      const target = !subject.trim() ? "subject" : !bodyText ? "body" : null;
      if (target) document.getElementById(target)?.focus();
    }
  }

  const done = uploads.filter((u) => u.status === "done" && u.path).map((u) => ({ path: u.path!, name: u.name }));

  return (
    <form action={action} onSubmit={onSubmit} noValidate className="nt-card">
      <input type="hidden" name="body" value={bodyText} />
      <input type="hidden" name="bodyHtml" value={bodyHtml} />
      <input type="hidden" name="attachments" value={JSON.stringify(done)} />
      <input type="hidden" name="priority" value={priority} />

      {clients && (
        <div className="nt-field">
          <label htmlFor="clientId" className="nt-label">
            Client <span className="nt-req" aria-hidden>*</span>
          </label>
          <select id="clientId" name="clientId" required defaultValue="" className="psd-select nt-input pr-9">
            <option value="" disabled>
              Choose a client…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {state?.field === "clientId" && <p className="nt-error">{state.error}</p>}
        </div>
      )}

      <div className="nt-field">
        <div className="flex items-baseline justify-between">
          <label htmlFor="subject" className="nt-label">
            Subject <span className="nt-req" aria-hidden>*</span>
          </label>
          <span className="nt-help tabular-nums">{subject.length}/200</span>
        </div>
        <input
          id="subject"
          name="subject"
          required
          maxLength={200}
          autoComplete="off"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
          aria-invalid={!!subjectError}
          aria-describedby={subjectError ? "subject-error" : "subject-help"}
          placeholder="e.g. Unable to log in to the client dashboard"
          className="nt-input"
        />
        {subjectError ? (
          <p id="subject-error" className="nt-error">{subjectError}</p>
        ) : (
          <p id="subject-help" className="nt-help">A short summary of the problem or request.</p>
        )}
      </div>

      <div className="nt-field">
        <label htmlFor="body" className="nt-label">
          Description <span className="nt-req" aria-hidden>*</span>
        </label>
        <RichTextEditor
          id="body"
          invalid={!!bodyError}
          describedBy="body-help"
          placeholder="Describe what happened, what you expected, and the steps to reproduce it."
          onChange={(html, text) => {
            setBodyHtml(html);
            setBodyText(text);
          }}
        />
        {bodyError && <p className="nt-error">{bodyError}</p>}
        <div id="body-help" className="nt-tip">
          <p className="font-semibold text-[#e4e4f0]">Helpful details to include</p>
          <ul>
            <li>What you were trying to do, and what happened instead</li>
            <li>Steps to reproduce, and any error messages shown</li>
            <li>Page URL, browser and device, if relevant</li>
          </ul>
        </div>
      </div>

      <div className="nt-field">
        <span className="nt-label" id="attach-label">
          Attachments <span className="font-normal text-[#9a9ab8]">(optional)</span>
        </span>
        <div
          role="button"
          tabIndex={0}
          aria-labelledby="attach-label"
          aria-describedby="attach-help"
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fileInput.current?.click())}
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
          }}
          className={`nt-drop ${dragging ? "nt-drop-on" : ""}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <span>
            <span className="font-semibold text-[#c4b5fd]">Choose files</span> or drag and drop here
          </span>
          <span id="attach-help" className="nt-help">
            PNG, JPG, GIF, WebP, PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP · up to {formatBytes(MAX_ATTACHMENT_BYTES)} each, {MAX_ATTACHMENTS} files max
          </span>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {attachmentsError && <p className="nt-error">{attachmentsError}</p>}
        {uploads.length > 0 && (
          <ul className="nt-files" aria-live="polite">
            {uploads.map((u) => (
              <li key={u.key} className={u.status === "error" ? "nt-file nt-file-err" : "nt-file"}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[14px] text-[#f0f0f5]">{u.name}</span>
                    <span className="shrink-0 text-[12px] text-[#9a9ab8]">{formatBytes(u.size)}</span>
                  </div>
                  {u.status === "uploading" && (
                    <div className="nt-bar" role="progressbar" aria-valuenow={u.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${u.name}`}>
                      <div style={{ width: `${u.progress}%` }} />
                    </div>
                  )}
                  {u.status === "error" && <p className="text-[12px] text-[#fca5a5]">{u.error}</p>}
                  {u.status === "done" && <p className="text-[12px] text-[#86efac]">Uploaded</p>}
                </div>
                <button type="button" onClick={() => remove(u)} className="nt-remove" aria-label={`Remove ${u.name}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <fieldset className="nt-field">
        <legend className="nt-label mb-2">Priority</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PRIORITY_OPTIONS.map((p) => (
            <label key={p} className={`nt-prio ${priority === p ? "nt-prio-on" : ""}`}>
              <input type="radio" name="priority-choice" value={p} checked={priority === p} onChange={() => setPriority(p)} className="sr-only" />
              <span className="text-[14px] font-semibold text-[#f0f0f5]">{PRIORITY_LABELS[p]}</span>
              <span className="text-[12px] leading-snug text-[#a8a8c4]">{PRIORITY_HINTS[p]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {formError && (
        <p role="alert" className="rounded-lg border border-[#7f1d1d] bg-[#2a0f14] px-3 py-2 text-[14px] text-[#fca5a5]">
          {formError}
        </p>
      )}

      <div className="nt-actions">
        <Link href="/tickets" className="nt-cancel">
          Cancel
        </Link>
        <button type="submit" disabled={pending || uploading} className="nt-submit">
          {pending ? "Submitting…" : uploading ? "Waiting for uploads…" : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
