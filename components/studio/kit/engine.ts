// Pure helpers of the memorisation kit (flashcard choices and the law/typology/chapter quiz generators).
// Ported 1:1 from the original v5/v8 kit script. Content comes in as arguments (from useStudioData()).

import type { Rec } from "@/lib/studio/types";

export const SITEKEY = "cafs_v5_personal_memory_a1";

export type KitData = {
  laws: Rec[];
  typologies: Rec[];
  chapters: Rec[];
  flashcards: Rec[];
  lawSpec: string[][];
  typeSpec: string[][];
  tpl: string[];
};

export type KitMemory = {
  ratings: Record<string, number>;
  quizzes: Rec[];
  recall: Record<string, boolean>;
  last: unknown;
};

export type KitSource = "laws" | "typologies" | "memory";

export type FlashState = {
  source: KitSource;
  label: string;
  ids: string[];
  i: number;
  flipped: boolean;
  mode: "challenge" | "flip";
  choice: string | null;
};

export type QuizState = {
  type: KitSource;
  domain: number;
  chapter: number;
  items: Rec[];
  answers: Record<number, number | number[]>;
  current: number;
  submitted: boolean;
};

export const EMPTY_MEMORY: KitMemory = { ratings: {}, quizzes: [], recall: {}, last: null };

export function normalizeMemory(raw: Partial<KitMemory> | null | undefined): KitMemory {
  const st = raw && typeof raw === "object" ? raw : {};
  return { ratings: st.ratings || {}, quizzes: st.quizzes || [], recall: st.recall || {}, last: st.last || null };
}

export const rand = <T,>(a: T[]): T[] => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

const sumChars = (s: string) => s.split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);

export function getList(data: KitData, k: KitSource): Rec[] {
  return k === "laws" ? data.laws : k === "typologies" ? data.typologies : data.flashcards;
}

export function flashList(data: KitData, flash: FlashState | null): Rec[] {
  const all = [...data.laws, ...data.typologies, ...data.flashcards];
  return (flash?.ids.map((id) => all.find((x) => x.id === id)).filter(Boolean) as Rec[]) || [];
}

/** Deterministic answer choices of the "Quiz me" flashcard mode. */
export function flashChoices(data: KitData, x: Rec, source: KitSource): { id: string; title: string }[] {
  const broad = source === "memory" ? data.flashcards.filter((f) => f.module === x.module) : source === "laws" ? data.laws : data.typologies;
  const group = broad.filter(
    (y) =>
      y.id !== x.id &&
      (source === "memory" ? y.quizGroup && y.quizGroup === x.quizGroup : source === "laws" ? y.jurisdiction === x.jurisdiction : y.category === x.category),
  );
  const related = broad.filter((y) => y.id !== x.id && !group.includes(y) && (source === "memory" ? y.chapter === x.chapter : true));
  const rest = broad.filter((y) => y.id !== x.id && !group.includes(y) && !related.includes(y));
  const seed = sumChars(String(x.id));
  const rank = (a: Rec) => (a.id.length * 31 + seed * 17 + a.id.charCodeAt(a.id.length - 1) * 13) % 101;
  for (const block of [group, related, rest]) block.sort((a, b) => rank(a) - rank(b));
  const peers = [...group, ...related, ...rest];
  const opts = [x, ...peers.slice(0, 3)];
  opts.sort((a, b) => ((sumChars(a.id) + seed * 3) % 17) - ((sumChars(b.id) + seed * 3) % 17));
  return opts.map((y) => ({ id: y.id, title: y.term || y.key }));
}

/** The prompt of a card, with the card title masked. */
export function flashClue(x: Rec): string {
  const d = x.study || {};
  const key = x.term || x.key;
  const useScenario = d.example && d.example.length > 45 && sumChars(String(x.id)) % 3 === 0;
  const original: string = (useScenario ? d.example : null) || d.meaning || x.definition || x.back || "";
  const pattern = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    return original.replace(new RegExp(pattern, "gi"), "this concept");
  } catch {
    return original;
  }
}

function pickTerm(data: KitData, source: "laws" | "typologies", needle: string): string | null {
  const items = source === "laws" ? data.laws : data.typologies;
  return items.find((x) => x.term === needle)?.term || items.find((x) => x.term.startsWith(needle))?.term || null;
}

function makeMulti(data: KitData, source: "laws" | "typologies", id: string, stem: string, goodTerms: string[], badTerms: string[], topic: string): Rec | null {
  const good = goodTerms.map((s) => pickTerm(data, source, s));
  const bad = badTerms.map((s) => pickTerm(data, source, s));
  if ([...good, ...bad].some((x) => !x)) return null;
  const tpl = data.tpl;
  return {
    id,
    source,
    stem: stem + (tpl[0] ?? " (Select TWO.)"),
    options: rand([...good, ...bad]),
    correct: good,
    kind: "multi",
    explanation: "Correct: " + good.join(" and ") + (tpl[1] ?? ". Compare the definitions and exclusions in the corresponding source notes."),
    topic,
  };
}

export function lawQuestions(data: KitData, topicMulti = "Cross-jurisdiction distinctions"): Rec[] {
  const all = data.laws;
  const tpl = data.tpl;
  const bank: Rec[] = [];
  for (const x of all) {
    const pool = all.filter((y) => y.id !== x.id && y.jurisdiction === x.jurisdiction);
    const others = pool.length >= 3 ? pool : all.filter((y) => y.id !== x.id);
    bank.push({
      id: x.id + "-IDENT",
      source: "laws",
      stem: (tpl[2] ?? "Which law or regulation best matches this description? ") + x.definition,
      options: rand([x, ...rand(others).slice(0, 3)]).map((v) => v.term),
      correct: x.term,
      explanation: x.term + ": " + x.definition + ". " + (x.note || ""),
      topic: x.jurisdiction,
    });
    const defs = rand([x, ...rand(others).slice(0, 3)]);
    bank.push({
      id: x.id + "-FOCUS",
      source: "laws",
      stem: (tpl[3] ?? "What is the principal exam focus of ") + x.term + "?",
      options: defs.map((z) => z.definition),
      correct: x.definition,
      explanation: x.term + ": " + x.definition + ". " + (x.note || ""),
      topic: x.jurisdiction,
    });
  }
  data.lawSpec.forEach((r, i) => {
    const q = makeMulti(data, "laws", "LAW-MULTI-" + i, (tpl[4] ?? "Which TWO of these best match: ") + r[0] + "?", r.slice(1, 3), r.slice(3, 5), topicMulti);
    if (q) bank.push(q);
  });
  return bank;
}

export function typeQuestions(data: KitData, topicMulti = "Cross-scheme distinctions"): Rec[] {
  const all = data.typologies.filter((x) => !["Enabling techniques", "Exam distinctions"].includes(x.category));
  const tpl = data.tpl;
  const bank: Rec[] = [];
  for (const x of all) {
    let pool = all.filter((y) => y.id !== x.id && y.category === x.category);
    pool = pool.length >= 3 ? pool : all.filter((y) => y.id !== x.id);
    bank.push({
      id: x.id + "-IDENT",
      source: "typologies",
      stem: (tpl[5] ?? "Identify the fraud concept described: ") + x.definition,
      options: rand([x, ...rand(pool).slice(0, 3)]).map((v) => v.term),
      correct: x.term,
      explanation: x.term + ": " + x.definition + ". " + x.note,
      topic: x.category,
    });
  }
  data.typeSpec.forEach((r, i) => {
    const q = makeMulti(data, "typologies", "TYPE-MULTI-" + i, (tpl[6] ?? "Select TWO terms related to ") + r[0] + ".", r.slice(1, 3), r.slice(3, 5), topicMulti);
    if (q) bank.push(q);
  });
  return bank;
}

export function memQuestions(data: KitData, m: number, c: number): Rec[] {
  const list = data.flashcards.filter((x) => x.module === m && x.chapter === c);
  const tpl = data.tpl;
  return list.map((x) => {
    const others = list.filter((y) => y.id !== x.id);
    return {
      id: x.id + "-RECALL",
      source: "memory",
      stem: (tpl[7] ?? "Which term best fits this description? ") + x.back,
      options: rand([x, ...rand(others).slice(0, 3)]).map((y) => y.key),
      correct: x.key,
      explanation: x.key + ": " + x.back,
      topic: `Module ${m} · Chapter ${c}`,
    };
  });
}

export function buildQuiz(data: KitData, source: KitSource, size = 20, m = 1, c = 1): QuizState {
  const bank = source === "laws" ? lawQuestions(data) : source === "typologies" ? typeQuestions(data) : memQuestions(data, m, c);
  size = Math.min(size, bank.length);
  const multi = bank.filter((x) => x.kind === "multi");
  const single = bank.filter((x) => x.kind !== "multi");
  const mCount = Math.min(multi.length, Math.floor(size * 0.25));
  const items = rand([...rand(multi).slice(0, mCount), ...rand(single).slice(0, size - mCount)]);
  return { type: source, domain: m, chapter: c, items, answers: {}, current: 0, submitted: false };
}

export function quizCorrect(q: Rec, selected: number | number[] | undefined): boolean {
  if (q.kind === "multi") {
    if (!Array.isArray(selected) || selected.length !== q.correct.length) return false;
    return selected.map((i) => q.options[i]).sort().join("|") === q.correct.slice().sort().join("|");
  }
  return selected !== undefined && q.options[Number(selected)] === q.correct;
}

/** Module / chapter selected on the Memorize page; kept while a flashcard deck or quiz is open (as in the original). */
export const lastPick = { module: 1, chapter: 1 };
export function rememberPick(module: number, chapter: number) {
  lastPick.module = module;
  lastPick.chapter = chapter;
}
