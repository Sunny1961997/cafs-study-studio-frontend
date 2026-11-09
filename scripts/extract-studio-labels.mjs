// Collects every t("key", "Default text") call of the React studio into public/data/labels.json,
// the file the API (or an admin) can edit to change any label without touching code.
//
//   npm run studio:labels

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dirs = ["components/studio", "app/(studio)", "lib/studio"];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (/\.(tsx|ts)$/.test(name)) yield full;
  }
}

// t("key", "text") / t('key', 'text') / t("key", `text`): plain string literals only.
const literal = String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|` + "`(?:[^`\\\\$]|\\\\.)*`" + ")";
const call = new RegExp(String.raw`\bt\(\s*` + literal + String.raw`\s*,\s*` + literal + String.raw`\s*\)`, "g");

function value(source) {
  if (source[0] === '"') return JSON.parse(source);
  const escapes = { n: "\n", t: "\t" };
  return source.slice(1, -1).replace(new RegExp(String.raw`\\(.)`, "g"), (_, c) => escapes[c] ?? c);
}

const labels = {};
const conflicts = [];
for (const dir of dirs) {
  for (const file of files(path.join(root, dir))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(call)) {
      const key = value(match[1]);
      const fallback = value(match[2]);
      if (key in labels && labels[key] !== fallback) conflicts.push(`${key} (${path.relative(root, file)})`);
      labels[key] ??= fallback;
    }
  }
}

const sorted = Object.fromEntries(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
mkdirSync(path.join(root, "public", "data"), { recursive: true });
writeFileSync(path.join(root, "public", "data", "labels.json"), JSON.stringify(sorted, null, 1));
console.log(`labels: ${Object.keys(sorted).length}`);
if (conflicts.length) {
  console.error("Same key with different default text:\n  " + conflicts.join("\n  "));
  process.exit(1);
}
