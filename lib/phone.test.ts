import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPhones, cleanPhone, phoneProblem } from "./phone.ts";

test("cleanPhone collapses whitespace", () => {
  assert.equal(cleanPhone("  +91  98765   43210 "), "+91 98765 43210");
  assert.equal(cleanPhone(undefined), "");
});

test("phoneProblem accepts common formats", () => {
  for (const p of ["+91 98765 43210", "(020) 555-0101", "020.555.0101", "9876543"]) {
    assert.equal(phoneProblem(p), null, p);
  }
});

test("phoneProblem rejects bad input", () => {
  assert.match(phoneProblem("")!, /required/);
  assert.match(phoneProblem("call me")!, /only contain/);
  assert.match(phoneProblem("12345")!, /7 and 15/);
  assert.match(phoneProblem("1234567890123456")!, /7 and 15/);
});

test("checkPhones: second number optional but validated", () => {
  assert.deepEqual(checkPhones("+91 98765 43210", ""), { phone: "+91 98765 43210", phone2: "" });
  assert.ok("error" in checkPhones("", "9876543"));
  assert.match((checkPhones("9876543", "abc") as { error: string }).error, /Second phone/);
});
