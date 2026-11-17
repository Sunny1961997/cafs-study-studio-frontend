// Regenerates public/data/*.json from the studio HTML.
//
//   npm run studio:extract -- "C:/path/to/CAFS_Study_Studio_v22_Integrated.html"
//
// Run it again whenever the HTML is updated, then restart nothing: the JSON files are
// plain static data (or serve the same files from the backend).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STUDIO_DATASETS, STUDIO_TEXT, extractDataset, extractText, injectDatasets } from "../lib/studioData.ts";

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run studio:extract -- "<path to CAFS_Study_Studio_*.html>"');
  process.exit(1);
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "data");
mkdirSync(out, { recursive: true });

const html = readFileSync(source, "utf8");
const data = {};
let missing = 0;

for (const { key } of STUDIO_DATASETS) {
  const value = extractDataset(html, key);
  if (value === undefined) {
    console.error(`MISSING  ${key} (not found in the HTML)`);
    missing++;
    continue;
  }
  data[key] = value;
  writeFileSync(path.join(out, `${key}.json`), JSON.stringify(value));
  console.log(`dataset  ${key.padEnd(12)} ${Array.isArray(value) ? value.length + " items" : "object"}`);
}

for (const { key } of STUDIO_TEXT) {
  const value = extractText(html, key);
  if (!value) {
    console.error(`MISSING  ${key}`);
    missing++;
    continue;
  }
  data[key] = value;
  writeFileSync(path.join(out, `${key}.json`), JSON.stringify(value));
  console.log(`text     ${key.padEnd(12)} ${value.length} strings`);
}

// Safety check: injecting what we just extracted must give back the same lists.
const again = injectDatasets(html, data);
const same = STUDIO_TEXT.every((t) => JSON.stringify(extractText(again, t.key)) === JSON.stringify(data[t.key]));
console.log(same ? "roundtrip OK" : "ROUNDTRIP MISMATCH");
process.exit(missing || !same ? 1 : 0);
