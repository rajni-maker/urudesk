import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { bodyText, isAutomated, parseAddress, senderAuthenticated, verifyWebhook } from "./inbound.ts";

const secret = "whsec_" + Buffer.from("test-secret-key").toString("base64");
function sign(id: string, ts: string, body: string) {
  const key = Buffer.from(secret.slice(6), "base64");
  return "v1," + createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
}

test("valid webhook signature is accepted", () => {
  const body = '{"type":"email.received"}';
  const h = { id: "msg_1", timestamp: "1000", signature: sign("msg_1", "1000", body) };
  assert.equal(verifyWebhook(secret, h, body, 1000), true);
});

test("tampered body, wrong secret, or old timestamp is rejected", () => {
  const body = '{"type":"email.received"}';
  const h = { id: "msg_1", timestamp: "1000", signature: sign("msg_1", "1000", body) };
  assert.equal(verifyWebhook(secret, h, body + " ", 1000), false);
  assert.equal(verifyWebhook("whsec_" + Buffer.from("other").toString("base64"), h, body, 1000), false);
  assert.equal(verifyWebhook(secret, h, body, 1000 + 301), false);
  assert.equal(verifyWebhook(secret, { ...h, signature: null }, body, 1000), false);
});

test("one of several signatures may match", () => {
  const body = "{}";
  const h = { id: "m", timestamp: "5", signature: `v1,AAAA ${sign("m", "5", body)}` };
  assert.equal(verifyWebhook(secret, h, body, 5), true);
});

test("parseAddress extracts and lowercases the address", () => {
  assert.equal(parseAddress("Biplop <Biplop@XYZ.com>"), "biplop@xyz.com");
  assert.equal(parseAddress("biplop@xyz.com"), "biplop@xyz.com");
  assert.equal(parseAddress("no address here"), null);
  assert.equal(parseAddress(null), null);
});

test("auto-replies and bounces are detected", () => {
  assert.equal(isAutomated({ "Auto-Submitted": "auto-replied" }, "a@x.com"), true);
  assert.equal(isAutomated({ "auto-submitted": "no" }, "a@x.com"), false);
  assert.equal(isAutomated({ Precedence: "bulk" }, "a@x.com"), true);
  assert.equal(isAutomated({ "X-Autoreply": "yes" }, "a@x.com"), true);
  assert.equal(isAutomated({}, "mailer-daemon@x.com"), true);
  assert.equal(isAutomated({}, "noreply@x.com"), true);
  assert.equal(isAutomated({}, "biplop@xyz.com"), false);
});

test("bodyText prefers text and strips html otherwise", () => {
  assert.equal(bodyText("  hello  ", "<p>ignored</p>"), "hello");
  assert.equal(bodyText(null, "<p>Hi &amp; bye</p><script>x()</script><p>two</p>"), "Hi & bye\ntwo");
  assert.equal(bodyText(null, null), "");
});

test("only DKIM or DMARC pass counts as authenticated", () => {
  assert.equal(senderAuthenticated({ spf: "pass", dkim: "gray", dmarc: "gray" }), false);
  assert.equal(senderAuthenticated({ dkim: "pass" }), true);
  assert.equal(senderAuthenticated({ dmarc: "pass" }), true);
  assert.equal(senderAuthenticated(null), false);
});
