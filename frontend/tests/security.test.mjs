// Run with: npm test   (Node 22.18+ runs the .ts helpers directly)
import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedAdmin } from "../lib/admin-access.ts";
import { rateLimited } from "../lib/rate-limit.ts";
import { safeLinks, safeUrl } from "../lib/safe-url.ts";
import { normalizeProjectStatus, publishedOnly, statusFromForm } from "../lib/project-status.ts";

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

test("project status: hiding the first project promotes the second without changing any sort_order, and publishing restores it", () => {
  const rows = [
    { slug: "a", sort_order: 0, status: "hidden" },
    { slug: "b", sort_order: 1, status: "published" },
    { slug: "c", sort_order: 2 }, // a row from before the status column existed
  ];
  const shown = publishedOnly(rows);
  assert.deepEqual(shown.map((r) => r.slug), ["b", "c"]);
  assert.deepEqual(rows.map((r) => r.sort_order), [0, 1, 2]); // nothing was renumbered
  assert.deepEqual(publishedOnly(rows.map((r) => (r.slug === "a" ? { ...r, status: "published" } : r))).map((r) => r.slug), ["a", "b", "c"]);
});

test("project status: only an exact 'hidden' hides; unknown or missing values never hide or crash", () => {
  assert.equal(normalizeProjectStatus("hidden"), "hidden");
  for (const value of ["published", "HIDDEN", "", null, undefined, 0, {}]) assert.equal(normalizeProjectStatus(value), "published");
  assert.equal(statusFromForm("hidden"), "hidden");
  assert.equal(statusFromForm("published"), "published");
  assert.equal(statusFromForm("draft"), undefined);
  assert.equal(statusFromForm(null), undefined);
  assert.equal(statusFromForm(new File([""], "x")), undefined);
});
