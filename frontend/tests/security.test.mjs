// Run with: npm test   (Node 22.18+ runs the .ts helpers directly)
import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedAdmin } from "../lib/admin-access.ts";
import { rateLimited } from "../lib/rate-limit.ts";
import { safeLinks, safeUrl } from "../lib/safe-url.ts";

test("admin allow-list: an unset list accepts a signed-in user, a set list accepts only listed emails", () => {
  delete process.env.ADMIN_EMAILS;
  assert.equal(isAllowedAdmin({ email: "x@y.com" }), true);
  assert.equal(isAllowedAdmin(null), false);

  process.env.ADMIN_EMAILS = " Owner@Example.com , other@example.com ";
  assert.equal(isAllowedAdmin({ email: "owner@example.com" }), true);
  assert.equal(isAllowedAdmin({ email: "OWNER@EXAMPLE.COM" }), true);
  assert.equal(isAllowedAdmin({ email: "stranger@example.com" }), false);
  assert.equal(isAllowedAdmin({ email: null }), false);
  assert.equal(isAllowedAdmin({}), false);
  delete process.env.ADMIN_EMAILS;
});

test("links: only http(s), mailto and site paths survive", () => {
  assert.equal(safeUrl("https://github.com/x"), "https://github.com/x");
  assert.equal(safeUrl("mailto:a@b.com"), "mailto:a@b.com");
  assert.equal(safeUrl("/resume.pdf"), "/resume.pdf");
  for (const bad of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,x", "//evil.com", "", null, 5]) {
    assert.equal(safeUrl(bad), "", String(bad));
  }
  assert.deepEqual(safeLinks([{ label: "ok", url: "https://a.com" }, { label: "bad", url: "javascript:1" }, { label: "", url: "https://b.com" }]), [
    { label: "ok", url: "https://a.com" },
  ]);
});

test("rate limiter: blocks after the limit and resets with the window", () => {
  const results = [0, 1, 2, 3, 4, 5].map((i) => rateLimited("k", 5, 1000, 1000 + i));
  assert.deepEqual(results, [false, false, false, false, false, true]);
  assert.equal(rateLimited("k", 5, 1000, 5000), false);
});
