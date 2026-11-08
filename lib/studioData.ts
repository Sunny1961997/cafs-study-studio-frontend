// Pure logic (no browser/Next imports) so scripts/extract-studio-data.mjs can use it too.

type Spec = {
  key: string;
  /** Exact text that precedes the literal in the source. */
  prefix: string;
  /** Present when the literal lives inside one of the base64 embedded apps (SOURCES). */
  source?: string;
  /** Part of `prefix` that is really the literal's opening bracket (keeps `const CASES=()=>` from matching). */
  keep?: string;
};

export const STUDIO_DATASETS = [
  { key: "bank", prefix: "const IMPORTED_BANK=" },
  { key: "exams", prefix: "const EXAMS=" },
  { key: "kit", prefix: "window.CAFS_KIT_DATA=" },
  { key: "handbook", prefix: "const HANDBOOK_LIBRARY = " },
  { key: "cases", prefix: "const CASES=[", keep: "[" },
  { key: "summaries", prefix: "const CHAPTER_SUMMARIES=" },
  { key: "redFlags", prefix: "const RED_FLAGS=" },
  { key: "studyFacts", prefix: "const STUDY_FACTS=" },
  { key: "studySheets", prefix: "const STUDY_SHEETS=" },
  { key: "tasks", prefix: "const tasks=" },
  { key: "traps", prefix: "const traps=" },
  { key: "typeSpec", prefix: "const TYPE_MULTI_SPEC=" },
  { key: "lawSpec", prefix: "const LAW_MULTI_SPEC=" },
  // Embedded apps: Fraud Laws guide and Integrated Knowledge module.
  { key: "lawsList", prefix: "const laws = ", source: "laws" },
  { key: "lawsQuiz", prefix: "const questions = ", source: "laws" },
  { key: "ikData", prefix: "const DATA=", source: "integratedKnowledge" },
  { key: "ikChapters", prefix: "const CH=", source: "integratedKnowledge" },
] as const satisfies readonly Spec[];

export type StudioDatasetKey = (typeof STUDIO_DATASETS)[number]["key"];

// Text lists: description paragraphs (copy*), UI text (ui*) and question templates (tpl).
// One ordered list of strings per document; item i replaces the i-th distinct string of that kind (all occurrences).
export const STUDIO_TEXT = [
  { key: "copy", kind: "copy" },
  { key: "copyLaws", kind: "copy", source: "laws" },
  { key: "copyIk", kind: "copy", source: "integratedKnowledge" },
  { key: "ui", kind: "ui" },
  { key: "uiLaws", kind: "ui", source: "laws" },
  { key: "uiIk", kind: "ui", source: "integratedKnowledge" },
  { key: "tpl", kind: "tpl" },
] as const;
export type StudioTextKey = (typeof STUDIO_TEXT)[number]["key"];
export type StudioData = Partial<Record<StudioDatasetKey | StudioTextKey, unknown>>;
const DATASETS: readonly Spec[] = STUDIO_DATASETS;

// Finds the end index (exclusive) of the literal starting at `start`.
function literalEnd(text: string, start: number): number {
  let depth = 0;
  let quote = "";
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function locate(text: string, dataset: Spec) {
  const prefixAt = text.indexOf(dataset.prefix);
  if (prefixAt === -1) return null;
  const start = prefixAt + dataset.prefix.length - (dataset.keep?.length ?? 0);
  const end = literalEnd(text, start);
  return end === -1 ? null : { start, end };
}

// --- Embedded apps (base64 pages inside `const SOURCES={name:'...'}`) -------------

const SOURCES_PREFIX = "const SOURCES={";

function sourcesRange(html: string) {
  const start = html.indexOf(SOURCES_PREFIX);
  if (start === -1) return null;
  const end = html.indexOf("'};", start);
  return end === -1 ? null : { start: start + SOURCES_PREFIX.length, end: end + 1 };
}

function fromBase64(value: string): string {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// The embedded apps are nested frames of the studio; they read the studio window's
// (API-backed) localStorage instead of the browser's own.
const SHARED_STORAGE =
  "<script>try{Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return window.parent.localStorage}})}catch(e){}</script>";

function mapSources(html: string, change: (name: string, page: string) => string): string {
  const range = sourcesRange(html);
  if (!range) return html;
  const body = html.slice(range.start, range.end).replace(/([A-Za-z_$][\w$]*):'([A-Za-z0-9+/=]*)'/g, (_, name, value) => {
    return `${name}:'${toBase64(change(name, fromBase64(value)))}'`;
  });
  return html.slice(0, range.start) + body + html.slice(range.end);
}

function readSource(html: string, name: string): string | null {
  const range = sourcesRange(html);
  if (!range) return null;
  const found = new RegExp(`(?:^|[,{])${name}:'([A-Za-z0-9+/=]*)'`).exec(html.slice(range.start, range.end));
  return found ? fromBase64(found[1]) : null;
}

// --- Text slots: descriptions, UI text and question templates --------------------
//
// Every plain-text string below is addressed by position: item i of a list replaces the
// i-th distinct string of its kind in that document (all of its occurrences). Lists are served by the API (copy*, ui*, tpl).

type Range = { start: number; end: number };
type Slot = { start: number; end: number; text: string; js: boolean };
type SlotKind = "copy" | "ui" | "tpl";

const BS = String.fromCharCode(92);

const inside = (ranges: Range[], at: number) => ranges.some((r) => at >= r.start && at < r.end);

function scan(text: string, regex: RegExp, js: boolean, blocked: Range[], accept: (value: string) => boolean): Slot[] {
  const found: Slot[] = [];
  for (const match of text.matchAll(regex)) {
    // Every capture group is a candidate (e.g. the label of a button helper call).
    let from = match.index;
    for (let g = 1; g < match.length; g++) {
      const value = match[g];
      if (value === undefined) continue;
      const start = text.indexOf(value, from);
      if (start === -1) continue;
      from = start + value.length;
      if (inside(blocked, start)) continue;
      if (value.includes("${") || value.includes(BS) || value.includes("`")) continue;
      if (!accept(value)) continue;
      found.push({ start, end: start + value.length, text: value, js });
    }
  }
  return found;
}

const sentence = (value: string) => value.trim().length >= 25;
const label = (value: string) => value.trim().length >= 3 && /[A-Za-z].*[A-Za-z]/.test(value);
const template = (value: string) =>
  /[A-Za-z]+ [A-Za-z]+/.test(value) && (/[?:.)\s]$/.test(value) || /^ ?\(?Select/.test(value) || /^Compare/.test(value));

const byStart = (a: Slot, b: Slot) => a.start - b.start;

function slotsOf(page: string, withTemplates: boolean): Record<SlotKind, Slot[]> {
  const datasetRanges: Range[] = [];
  for (const dataset of DATASETS) {
    const spot = locate(page, dataset);
    if (spot) datasetRanges.push(spot);
  }

  // Question-building templates (stems, "(Select TWO.)", "Correct: " ...) live in the
  // quiz generators between makeMulti and startQuiz.
  let tpl: Slot[] = [];
  const regionStart = withTemplates ? page.indexOf("function makeMulti") : -1;
  const regionEnd = withTemplates ? page.indexOf("function startQuiz") : -1;
  if (regionStart !== -1 && regionEnd > regionStart) {
    const region = page.slice(regionStart, regionEnd);
    const inRegion = scan(region, /'([^'\\]*)'/g, true, [], template);
    tpl = inRegion.map((slot) => ({ ...slot, start: slot.start + regionStart, end: slot.end + regionStart }));
    tpl = tpl.filter((slot) => !inside(datasetRanges, slot.start));
  }
  const tplRanges = tpl.map((s) => ({ start: s.start, end: s.end }));

  const copy = [
    ...scan(page, /<p(?:\s[^>]*)?>((?:(?!<\/p>)[^`\\])*)<\/p>/g, false, [...datasetRanges, ...tplRanges], sentence),
    ...scan(page, /(?:^|[^A-Za-z0-9_])desc:'([^']*)'/g, true, [...datasetRanges, ...tplRanges], sentence),
  ].sort(byStart);
  const copyRanges = copy.map((s) => ({ start: s.start, end: s.end }));
  // A <p> that wraps other tags owns them; they are not separate UI slots.
  const wrappedRanges = [...page.matchAll(/<p(?:\s[^>]*)?>((?:(?!<\/p>)[^`\\])*)<\/p>/g)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
  }));
  const blocked = [...datasetRanges, ...tplRanges, ...copyRanges, ...wrappedRanges];

  const ui = [
    ...scan(page, /<(?:h[1-6]|button|label|th|td|li|summary|small|strong|b|em|legend|option|a|span|div)(?:\s[^>]*)?>([^<>`\\$]*)<\/(?:h[1-6]|button|label|th|td|li|summary|small|strong|b|em|legend|option|a|span|div)>/g, false, blocked, label),
    // JS-side labels: nav tuples, button/link helpers, "key:'Capitalised phrase'" fields.
    ...scan(page, /\['[A-Za-z]+','([^'\\]+)','[A-Za-z]+'\]/g, true, blocked, label),
    ...scan(page, /\bmkBtn\('[A-Za-z0-9]+','([^'\\]+)'/g, true, blocked, label),
    ...scan(page, /\bgo\('([^'\\]+)','[A-Za-z]+'\)/g, true, blocked, label),
    ...scan(page, /\bstatCard\('([^'\\]+)'/g, true, blocked, label),
    ...scan(page, /(?:^|[^A-Za-z0-9_])[A-Za-z_]\w*:'([A-Z][^'\\]* [^'\\]*)'/g, true, blocked, label),
  ].sort(byStart);

  // Overlaps (e.g. a label matched by two patterns) keep the first slot only.
  const unique: Slot[] = [];
  for (const slot of ui) {
    const last = unique[unique.length - 1];
    if (last && slot.start < last.end) continue;
    unique.push(slot);
  }

  return { copy, ui: unique, tpl: tpl.sort(byStart) };
}

// Injected text may sit in HTML or in a single-quoted JS string, so characters that
// could end either are escaped for that context.
function htmlText(value: string): string {
  return value
    .split(BS)
    .join("")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&quot;")
    .replace(/`/g, "&#96;")
    .split("${")
    .join("$&#123;");
}

function jsText(value: string): string {
  return JSON.stringify(value)
    .slice(1, -1)
    .split(BS + '"')
    .join('"')
    .split("'")
    .join(BS + "'")
    .split("${")
    .join(BS + "$" + "{");
}

function pageFor(html: string, source?: string): string | null {
  return source ? readSource(html, source) : html;
}

/** Reads one text list of a document (used to seed/verify the API). */
export function extractText(html: string, key: StudioTextKey): string[] | undefined {
  const entry = STUDIO_TEXT.find((item) => item.key === key)!;
  const source = "source" in entry ? entry.source : undefined;
  const page = pageFor(html, source);
  // Identical strings appear once (first-occurrence order) and are replaced everywhere.
  return page ? uniqueTexts(slotsOf(page, !source)[entry.kind]) : undefined;
}

function uniqueTexts(slots: Slot[]): string[] {
  return [...new Set(slots.map((slot) => slot.text))];
}

function applyText(page: string, lists: Partial<Record<SlotKind, unknown>>, withTemplates: boolean): string {
  const slots = slotsOf(page, withTemplates);
  const changes: { slot: Slot; next: string }[] = [];
  for (const kind of ["copy", "ui", "tpl"] as const) {
    const list = lists[kind];
    if (!Array.isArray(list)) continue;
    const index = new Map(uniqueTexts(slots[kind]).map((text, i) => [text, i]));
    for (const slot of slots[kind]) {
      const next = list[index.get(slot.text)!];
      if (typeof next === "string" && next !== slot.text) changes.push({ slot, next });
    }
  }
  changes.sort((a, b) => b.slot.start - a.slot.start);
  let result = page;
  for (const { slot, next } of changes) {
    result = result.slice(0, slot.start) + (slot.js ? jsText(next) : htmlText(next)) + result.slice(slot.end);
  }
  return result;
}


// --- Public API -------------------------------------------------------------------

/** Reads one dataset out of the studio HTML (used to seed/verify the API). */
export function extractDataset(html: string, key: StudioDatasetKey): unknown {
  const dataset = DATASETS.find((item) => item.key === key)!;
  const text = dataset.source ? readSource(html, dataset.source) : html;
  const spot = text ? locate(text, dataset) : null;
  // Some literals use JS syntax (single quotes, bare keys), so evaluate rather than JSON.parse.
  return spot && text ? new Function(`return ${text.slice(spot.start, spot.end)}`)() : undefined;
}

function replaceIn(text: string, datasets: readonly Spec[], data: StudioData): string {
  let result = text;
  for (const dataset of datasets) {
    const value = data[dataset.key as StudioDatasetKey];
    if (value === undefined) continue;
    const spot = locate(result, dataset);
    if (!spot) continue;
    // "<" is escaped so data can never close the surrounding <script>.
    const json = JSON.stringify(value).replace(/</g, "\\u003c");
    result = result.slice(0, spot.start) + json + result.slice(spot.end);
  }
  return result;
}

// Counts the studio writes into its copy ("580 additional questions", "54 topics" ...).
// Each phrase is rewritten from the live data so the text never drifts from it.
type Data = StudioData;
const len = (value: unknown) => (Array.isArray(value) ? value.length : undefined);
const COUNTS: { find: string; value: (d: Data) => number | undefined }[] = (() => {
  const bank = (d: Data) => len(d.bank);
  const flags = (d: Data) => len(d.redFlags);
  const laws = (d: Data) => len(d.lawsList);
  const topics = (d: Data) => len((d.ikData as { rows?: unknown } | undefined)?.rows);
  const topicQuestions = (d: Data) => len((d.ikData as { questions?: unknown } | undefined)?.questions);
  const addedMocks = (d: Data) =>
    Array.isArray(d.exams)
      ? d.exams.filter((e: { id?: string }) => /^mock-\d\d$/.test(e.id ?? "")).reduce((n: number, e: { questions?: unknown[] }) => n + (e.questions?.length ?? 0), 0)
      : undefined;
  // Editorial-status figures come from the question metadata of the exams.
  const examQuestions = (d: Data): { version?: string; reviewStatus?: string }[] | undefined =>
    Array.isArray(d.exams) ? d.exams.flatMap((e: { questions?: unknown[] }) => (e.questions ?? []) as { version?: string; reviewStatus?: string }[]) : undefined;
  const status = (value: string, field: "version" | "reviewStatus" = "reviewStatus") => (d: Data) =>
    examQuestions(d)?.filter((q) => q[field] === value).length;
  const rewritten = status("18.0-domain12-rewrite", "version");
  const fullRewrites = status("full-editorial-rewrite-sme-verification-pending");
  const sourceChecks = status("editorially-rewritten-source-check-pending");
  const formReplacements = (d: Data) => {
    const a = fullRewrites(d);
    const b = sourceChecks(d);
    return a === undefined || b === undefined ? undefined : a + b;
  };
  return [
    { find: "contain 117 rewritten", value: rewritten },
    { find: "remaining 116 provisional", value: fullRewrites },
    { find: "All 161 form replacements", value: formReplacements },
    { find: "400 imported practice", value: status("imported-original") },
    { find: "30 pilot-reviewed", value: status("pilot-reviewed") },
    { find: "580 supplemental", value: bank },
    { find: "Practise 580", value: bank },
    { find: "your 580", value: bank },
    { find: "'Practice questions','580'", value: bank },
    { find: "400 added mock questions", value: addedMocks },
    { find: "319 fraud indicators", value: flags },
    { find: "Explore the 19 laws", value: laws },
    { find: "19 LAWS / 12 EXAM CHECKS", value: laws },
    { find: "Review all 19 laws", value: laws },
    { find: "19-law guide", value: laws },
    { find: "Integrated Knowledge · 54 Topics", value: topics },
    { find: "54 TOPICS / 120 QUESTIONS", value: topics },
    { find: "Study all 54", value: topics },
    { find: "Connect all 54 topics", value: topics },
    { find: "Explore 54 topics", value: topics },
    { find: "practise 120 integrated", value: topicQuestions },
    { find: "120-question", value: topicQuestions },
  ];
})();

function fillCounts(html: string, data: Data): string {
  let result = html;
  for (const { find, value } of COUNTS) {
    const n = value(data);
    if (n === undefined) continue;
    const next = find.replace(/\d+/, String(n));
    result = result.split(find).join(next);
  }
  // The "12 exam checks" in the same label come from the law quiz.
  const checks = len(data.lawsQuiz);
  if (checks !== undefined) result = result.split("/ 12 EXAM CHECKS").join(`/ ${checks} EXAM CHECKS`);
  return result;
}

/** Replaces the embedded datasets with the supplied values and shares storage with the embedded apps. */
export function injectDatasets(html: string, data: StudioData): string {
  const own = fillCounts(applyText(replaceIn(html, DATASETS.filter((d) => !d.source), data), { copy: data.copy, ui: data.ui, tpl: data.tpl }, true), data);
  return mapSources(own, (name, page) => {
    const lists = Object.fromEntries(STUDIO_TEXT.filter((t) => "source" in t && t.source === name).map((t) => [t.kind, data[t.key]]));
    const replaced = applyText(replaceIn(page, DATASETS.filter((d) => d.source === name), data), lists, false);
    const head = replaced.search(/<head[^>]*>/i);
    if (head === -1) return SHARED_STORAGE + replaced;
    const end = replaced.indexOf(">", head) + 1;
    return replaced.slice(0, end) + SHARED_STORAGE + replaced.slice(end);
  });
}
