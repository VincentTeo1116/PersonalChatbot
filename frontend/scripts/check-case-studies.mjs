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
const { jsonLdString } = loadHelper("lib/seo.ts");

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
