import { test } from "node:test";
import assert from "node:assert/strict";
import { autoStatusOnAssign, isPriority, isStatus, parseFilters } from "./tickets.ts";

test("assigning an open ticket moves it to in_progress", () => {
  assert.equal(autoStatusOnAssign("open", "u1"), "in_progress");
});

test("assigning a ticket that is already moving leaves status alone", () => {
  assert.equal(autoStatusOnAssign("in_progress", "u1"), null);
  assert.equal(autoStatusOnAssign("resolved", "u1"), null);
});

test("unassigning never moves status", () => {
  assert.equal(autoStatusOnAssign("open", null), null);
  assert.equal(autoStatusOnAssign("open", ""), null);
});

test("status and priority guards accept only Phase 1 values", () => {
  assert.equal(isStatus("in_progress"), true);
  assert.equal(isStatus("closed"), false);
  assert.equal(isPriority("normal"), true);
  assert.equal(isPriority("urgent"), false);
  assert.equal(isPriority(undefined), false);
});

test("parseFilters keeps valid values and drops the rest", () => {
  assert.deepEqual(parseFilters({ status: "open", priority: "high" }), { status: "open", priority: "high" });
  assert.deepEqual(parseFilters({ status: "bogus" }), { status: null, priority: null });
  assert.deepEqual(parseFilters({ status: ["resolved", "open"] }), { status: "resolved", priority: null });
});
