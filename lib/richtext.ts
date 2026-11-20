import sanitizeHtml from "sanitize-html";

// Allowlist for ticket descriptions written in the editor. Anything else
// (scripts, styles, event handlers, images, javascript: links) is dropped.
// Run on write and again on render, so old or hand-crafted rows are safe too.
export function sanitizeTicketHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "s", "code", "pre", "blockquote", "ul", "ol", "li", "h3", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] }, // target/rel are always overwritten below
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
    },
  });
}

export const MAX_BODY_HTML = 50_000;
