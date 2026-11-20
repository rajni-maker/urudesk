"use client";

import { useState, useTransition } from "react";
import RichTextEditor from "./RichTextEditor";
import { addReply } from "@/app/tickets/actions";

export default function ReplyBox({ ticketId }: { ticketId: string }) {
  const [html, setHtml] = useState("");
  const [text, setText] = useState("");
  const [round, setRound] = useState(0); // bump to remount (clear) the editor after sending
  const [pending, start] = useTransition();

  function send() {
    if (!text) return;
    const fd = new FormData();
    fd.set("body", text);
    fd.set("bodyHtml", html);
    start(async () => {
      await addReply(ticketId, fd);
      setHtml("");
      setText("");
      setRound((r) => r + 1);
    });
  }

  return (
    <div className="psd-card flex flex-col gap-3 rounded-2xl p-5">
      <RichTextEditor
        key={round}
        id="reply"
        label="Reply"
        minHeight={110}
        placeholder="Write a reply…"
        onChange={(h, t) => {
          setHtml(h);
          setText(t);
        }}
      />
      <button type="button" onClick={send} disabled={pending || !text} className="nt-submit self-end">
        {pending ? "Sending…" : "Send reply"}
      </button>
    </div>
  );
}
