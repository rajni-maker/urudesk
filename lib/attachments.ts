// Ticket attachment rules shared by the browser (fast feedback) and the server
// (the actual gate). The server never trusts the name or declared type: it
// sniffs the stored bytes with sniffMime() before linking a file to a ticket.

export const ATTACHMENT_BUCKET = "ticket-attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;

// Extension → the MIME type we upload and store it as.
export const ALLOWED_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
};

export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_TYPES).map((e) => `.${e}`).join(",");

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Declared-type check: extension on the allowlist and size within limits. */
export function checkAttachment(name: string, size: number): string | null {
  if (!ALLOWED_TYPES[extensionOf(name)]) return `${name}: this file type isn't supported.`;
  if (size <= 0) return `${name} is empty.`;
  if (size > MAX_ATTACHMENT_BYTES) return `${name} is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  return null;
}

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/**
 * The real MIME type of `bytes`, if it is an allowed type whose content
 * matches the file's extension. Returns null for anything else (renamed
 * executables, HTML posing as .txt, images with a .pdf name…).
 */
export function sniffMime(bytes: Uint8Array, name: string): string | null {
  const ext = extensionOf(name);
  const declared = ALLOWED_TYPES[ext];
  if (!declared) return null;

  let actual: string | null = null;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) actual = "image/png";
  else if (startsWith(bytes, [0xff, 0xd8, 0xff])) actual = "image/jpeg";
  else if (startsWith(bytes, ascii("GIF87a")) || startsWith(bytes, ascii("GIF89a"))) actual = "image/gif";
  else if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) actual = "image/webp";
  else if (startsWith(bytes, ascii("%PDF-"))) actual = "application/pdf";
  else if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // Office files are zip containers; the extension picks which one.
    actual = ["docx", "xlsx", "pptx", "zip"].includes(ext) ? declared : null;
  } else if (declared.startsWith("text/") && isPlainText(bytes)) actual = declared;

  return actual === declared ? actual : null;
}

// Text files have no signature: require valid UTF-8, no NUL bytes, and no
// markup a browser might sniff as HTML.
function isPlainText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, 4096));
  } catch {
    return false;
  }
  return !/<\s*(html|script|svg|iframe|body|!doctype)/i.test(text);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Storage path for an upload: always inside the uploader's own folder. */
export const ownsUploadPath = (path: string, userId: string) =>
  new RegExp(`^${userId}/[0-9a-f-]{36}\\.[a-z0-9]+$`).test(path);
