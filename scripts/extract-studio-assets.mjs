// Extracts the visual assets of the studio HTML for the React port:
//   - every <style> block  -> app/(studio)/studio/studio.css   (same order, so the cascade is identical)
//   - the embedded logo    -> public/studio/fcl-logo.png
//
//   npm run studio:assets -- "C:/path/to/CAFS_Study_Studio_v22_Integrated.html"

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run studio:assets -- "<path to CAFS_Study_Studio_*.html>"');
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(source, "utf8");

// <style> elements that sit inside <script> text (JS templates) are not real stylesheets.
const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/g, (match) => " ".repeat(match.length));
const blocks = [];
for (const match of withoutScripts.matchAll(/<style\b[^>]*>/g)) {
  const start = match.index + match[0].length;
  const end = withoutScripts.indexOf("</style>", start);
  const id = /id="([^"]+)"/.exec(match[0])?.[1] ?? "base";
  blocks.push(`/* ===== <style ${id}> ===== */\n${html.slice(start, end)}`);
}

const cssPath = path.join(root, "app", "(studio)", "studio", "studio.css");
mkdirSync(path.dirname(cssPath), { recursive: true });
writeFileSync(cssPath, blocks.join("\n\n") + "\n");
console.log(`css   ${blocks.length} style blocks -> ${path.relative(root, cssPath)}`);

const logo = /const fclLogo="data:image\/png;base64,([A-Za-z0-9+/=]+)"/.exec(html);
if (logo) {
  const out = path.join(root, "public", "studio", "fcl-logo.png");
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(logo[1], "base64"));
  console.log(`logo  ${path.relative(root, out)}`);
} else {
  console.error("logo not found");
}
