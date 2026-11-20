import { test } from "node:test";
import assert from "node:assert/strict";
import { sniffMime, checkAttachment, ownsUploadPath } from "./attachments.ts";
import { sanitizeTicketHtml } from "./richtext.ts";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

test("sniffMime accepts real files matching their extension", () => {
  assert.equal(sniffMime(bytes([0x89], "PNG\r\n", [0x1a, 0x0a, 0]), "shot.PNG"), "image/png");
  assert.equal(sniffMime(bytes([0xff, 0xd8, 0xff, 0xe0]), "a.jpeg"), "image/jpeg");
  assert.equal(sniffMime(bytes("RIFF", [0, 0, 0, 0], "WEBP"), "a.webp"), "image/webp");
  assert.equal(sniffMime(bytes("%PDF-1.7"), "doc.pdf"), "application/pdf");
  assert.equal(sniffMime(bytes("PK", [3, 4]), "report.docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(sniffMime(bytes("error at line 3\n"), "app.log"), "text/plain");
});

test("sniffMime rejects mismatches and disguised content", () => {
  assert.equal(sniffMime(bytes("%PDF-1.7"), "image.png"), null);
  assert.equal(sniffMime(bytes("MZ", [0x90, 0]), "setup.pdf"), null);
  assert.equal(sniffMime(bytes("<!DOCTYPE html><script>x</script>"), "notes.txt"), null);
  assert.equal(sniffMime(bytes("abc", [0], "def"), "notes.txt"), null);
  assert.equal(sniffMime(bytes("<svg onload=alert(1)>"), "x.svg"), null);
});

test("checkAttachment enforces extension and size", () => {
  assert.equal(checkAttachment("a.png", 100), null);
  assert.match(checkAttachment("a.exe", 100)!, /isn't supported/);
  assert.match(checkAttachment("a.png", 11 * 1024 * 1024)!, /larger than/);
});

test("ownsUploadPath only allows the uploader's folder", () => {
  const me = "11111111-2222-3333-4444-555555555555";
  const file = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png";
  assert.ok(ownsUploadPath(`${me}/${file}`, me));
  assert.ok(!ownsUploadPath(`99999999-2222-3333-4444-555555555555/${file}`, me));
  assert.ok(!ownsUploadPath(`${me}/../other/${file}`, me));
});

test("sanitizeTicketHtml keeps formatting, strips script vectors", () => {
  const out = sanitizeTicketHtml(
    `<h3>Steps</h3><p><strong>b</strong><em>i</em><img src=x onerror=alert(1)></p><ul><li>one</li></ul>` +
      `<a href="javascript:alert(1)">bad</a><a href="https://x.com" onclick="y()">ok</a><script>alert(1)</script>`,
  );
  assert.equal(
    out,
    `<h3>Steps</h3><p><strong>b</strong><em>i</em></p><ul><li>one</li></ul>` +
      `<a target="_blank" rel="noopener noreferrer nofollow">bad</a><a href="https://x.com" target="_blank" rel="noopener noreferrer nofollow">ok</a>`,
  );
});
