import { test } from "node:test";
import assert from "node:assert/strict";
import { autoStatusOnAssign, isPriority, isStatus, parseFilters, timeAgo } from "./tickets.ts";

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

test("timeAgo buckets recent times and falls back to a date", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  const ago = (sec: number) => new Date(now - sec * 1000).toISOString();
  assert.equal(timeAgo(ago(10), now), "just now");
  assert.equal(timeAgo(ago(5 * 60), now), "5 min ago");
  assert.equal(timeAgo(ago(3 * 3600), now), "3 h ago");
  assert.equal(timeAgo(ago(86400 + 60), now), "yesterday");
  assert.equal(timeAgo(ago(3 * 86400), now), "3 days ago");
  assert.equal(timeAgo("2026-10-01T06:00:00Z", now), "1 Oct 2026");
  assert.equal(timeAgo(ago(-60), now), "just now"); // clock skew never goes negative
});
