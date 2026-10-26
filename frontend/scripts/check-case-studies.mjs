import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

// Load these dependency-free helpers in memory without producing build artifacts.
function loadHelper(file) {
  const source = fs.readFileSync(path.join(scriptDirectory, "..", file), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  });
  const exports = {};
  new Function("exports", compiled.outputText)(exports);
  return exports;
}

const { normalizeCaseStudy } = loadHelper("lib/project-case-study.ts");
const { jsonLdString, metaDescription, contentMetadata } = loadHelper("lib/seo.ts");
const { classifyLink } = loadHelper("lib/analytics-events.ts");
const { editorialSeoFields } = loadHelper("lib/editorial-seo.ts");

for (const input of [undefined, null, [], "draft", 42]) {
  assert.deepEqual(normalizeCaseStudy(input), {});
}
assert.deepEqual(normalizeCaseStudy({
  problem: "  A real problem.  ", validation: "  ", limitations: ["invalid"],
  private_notes: "Must not appear on the public page.",
}), { problem: "A real problem." });

// An admin-entered description must survive JSON decoding without closing its script tag.
const payload = { description: '</script><script>alert("test")</script>' };
const encoded = jsonLdString(payload);
assert.equal(encoded.includes("<"), false);
assert.deepEqual(JSON.parse(encoded), payload);
console.log("Passed: legacy case studies, field filtering, and JSON-LD script escaping.");

assert.equal(metaDescription("  A\n readable   summary.  "), "A readable summary.");
assert.ok(metaDescription("A descriptive project summary. ".repeat(20)).length <= 160);
assert.ok(contentMetadata("Research", "Summary", "/research").alternates.canonical.endsWith("/research"));
assert.equal(classifyLink("https://github.com/user/repo?secret=ignored", "https://example.com"), "github_click");
assert.equal(classifyLink("https://github.com.attacker.example/repo", "https://example.com"), null);
assert.equal(classifyLink("mailto:private@example.com?body=personal", "https://example.com"), "email_click");
assert.equal(classifyLink("/#contact", "https://example.com/projects/demo"), "contact_click");
assert.equal(classifyLink("https://elsewhere.example/#contact", "https://example.com"), null);
assert.equal(classifyLink("javascript:alert(1)", "https://example.com"), null);
const legacyForm = new FormData();
assert.deepEqual(editorialSeoFields(legacyForm), {});
legacyForm.set("seoEnabled", "true");
legacyForm.set("seoTitle", "   ");
legacyForm.set("seoDescription", "A".repeat(500));
assert.equal(editorialSeoFields(legacyForm).seo_title, null);
assert.equal(editorialSeoFields(legacyForm).seo_description.length, 320);
console.log("Passed: SEO summaries, canonicals, safe event classification, and legacy editorial forms.");
