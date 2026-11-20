"use client";

import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";

type Props = {
  id: string;
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
  minHeight?: number;
  label?: string;
  onChange: (html: string, text: string) => void;
};

/**
 * Small Tiptap editor. Only the marks the server sanitiser allows are exposed:
 * bold, italic, underline, lists, links, inline code and code blocks.
 */
export default function RichTextEditor({ id, placeholder, invalid, describedBy, minHeight = 180, label = "Description", onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
      }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: "rte-content",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML(), editor.getText().trim()),
  });

  return (
    <div className={`rte ${invalid ? "rte-invalid" : ""}`}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

const LINK_ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

const INACTIVE = { bold: false, italic: false, underline: false, bullet: false, ordered: false, link: false, code: false, codeBlock: false };

function Toolbar({ editor }: { editor: Editor | null }) {
  // The selector yields null until the editor's first transaction, so fall back to
  // "nothing active" — the buttons must be visible before the user starts typing.
  const state =
    useEditorState({
      editor,
      selector: ({ editor: e }) =>
        e
          ? {
              bold: e.isActive("bold"),
              italic: e.isActive("italic"),
              underline: e.isActive("underline"),
              bullet: e.isActive("bulletList"),
              ordered: e.isActive("orderedList"),
              link: e.isActive("link"),
              code: e.isActive("code"),
              codeBlock: e.isActive("codeBlock"),
            }
          : null,
    }) ?? INACTIVE;

  const c = () => editor!.chain().focus();
  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) return void c().extendMarkRange("link").unsetLink().run();
    const href = /^(https?:|mailto:)/i.test(url) ? url.trim() : `https://${url.trim()}`;
    c().extendMarkRange("link").setLink({ href }).run();
  }

  const buttons: { label: string; icon: React.ReactNode; active: boolean; run: () => void }[] = [
    { label: "Bold", icon: "B", active: state.bold, run: () => c().toggleBold().run() },
    { label: "Italic", icon: "I", active: state.italic, run: () => c().toggleItalic().run() },
    { label: "Underline", icon: "U", active: state.underline, run: () => c().toggleUnderline().run() },
    { label: "Bulleted list", icon: "•", active: state.bullet, run: () => c().toggleBulletList().run() },
    { label: "Numbered list", icon: "1.", active: state.ordered, run: () => c().toggleOrderedList().run() },
    { label: "Link", icon: LINK_ICON, active: state.link, run: setLink },
    { label: "Inline code", icon: "<>", active: state.code, run: () => c().toggleCode().run() },
    { label: "Code block", icon: "{ }", active: state.codeBlock, run: () => c().toggleCodeBlock().run() },
  ];

  return (
    <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
      {buttons.map((b, i) => (
        <button
          key={b.label}
          type="button"
          title={b.label}
          aria-label={b.label}
          aria-pressed={b.active}
          disabled={!editor}
          onMouseDown={(e) => e.preventDefault()}
          onClick={b.run}
          className={`rte-btn ${b.active ? "rte-btn-on" : ""} ${i === 3 || i === 5 ? "rte-sep" : ""}`}
        >
          <span
            className={
              b.label === "Bold" ? "font-bold" : b.label === "Italic" ? "italic font-serif" : b.label === "Underline" ? "underline" : "font-mono text-[12px]"
            }
          >
            {b.icon}
          </span>
        </button>
      ))}
    </div>
  );
}
