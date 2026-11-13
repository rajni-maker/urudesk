import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdmin, isUserRole, roleLabel } from "./roles.ts";

test("only 'admin' is an admin", () => {
  assert.equal(isAdmin("admin"), true);
  assert.equal(isAdmin("client"), false);
  assert.equal(isAdmin(null), false);
});

test("isUserRole guards the invite form value", () => {
  assert.equal(isUserRole("client"), true);
  assert.equal(isUserRole("support_rep"), false);
});

test("roleLabel names both roles and falls back", () => {
  assert.equal(roleLabel("admin"), "Internal Admin");
  assert.equal(roleLabel("client"), "Client");
  assert.equal(roleLabel("organization_admin"), "Member");
});
