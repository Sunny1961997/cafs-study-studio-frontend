// Pure adaptive-revision logic (port of the adaptive-v15 script): evidence from the learner db,
// topic ranking, linked-resource matching and rechecks. No DOM, no storage.

import { isCorrect } from "@/lib/studio/engine";
import type { Db, Exam, ExamQuestion, Rec } from "@/lib/studio/types";

export const ADAPTIVE_KEY = "cafs_studio_v15_adaptive_learning";

export const MODULES: Record<number, string> = {
  1: "Building a Fraud Risk Management Program",
  2: "Fraud Detection & Analytics",
  3: "Fraud Investigations",
};

export type QuizItem = { id: string; stemKey: string; correct: boolean };
export type QuizRecord = {
  topicKey: string;
  label: string;
  domain: number;
  correct: number;
  total: number;
  percent: number;
  at: number;
  items?: QuizItem[];
};
export type StepFlags = { summary: boolean; flags: boolean; cases: boolean };
export type AdaptiveState = { steps: Record<string, StepFlags>; quizzes: QuizRecord[] };

export const EMPTY_ADAPTIVE: AdaptiveState = { steps: {}, quizzes: [] };

/** Normalises whatever is stored under ADAPTIVE_KEY. */
export function normaliseState(v: unknown): AdaptiveState {
  const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Partial<AdaptiveState>;
  return {
    steps: o.steps && typeof o.steps === "object" ? o.steps : {},
    quizzes: Array.isArray(o.quizzes) ? o.quizzes : [],
  };
}

export type Topic = {
  key: string;
  domain: number;
  label: string;
  samples: number;
  correct: number;
  wrong: number;
  questions: ExamQuestion[];
  last: number;
  quiz?: QuizRecord;
  accuracy: number | null;
  score: number;
  isProvisional: boolean;
  status: string;
};

const STOP = new Set(
  "a an the and or of for by with to in on at as that this which what where when who how from into using use uses it its is are was were can be does do not most best first next correct should could would more all each certain other one two three key different between under guide chapter section study studyguide fraud fraudulent financial bank banking risk risks customer customers organization organizations account accounts activity activities transaction transactions investigate investigating investigation investigations management program detection analytics source based process".split(
    " ",
  ),
);
const ALIAS: Record<string, string> = {
  models: "model", patterns: "pattern", behaviours: "behavior", behaviour: "behavior", biometrics: "biometric",
  indicators: "indicator", controls: "control", payments: "payment", data: "data", assessment: "assessment",
  assessments: "assessment", training: "training", evaluation: "evaluation", techniques: "technique",
  documents: "document", interviews: "interview", interviewing: "interview", cases: "case", mules: "mule",
  claims: "claim", typos: "typo", metrics: "metric", regulations: "regulation", analytics: "analytic",
  analyses: "analysis", losses: "loss", alerts: "alert", investigative: "investigation", governance: "governance",
  tuning: "tuning",
};

export const words = (x: unknown): string[] =>
  String(x || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => ALIAS[w] || (w.endsWith("s") && w.length > 6 ? w.slice(0, -1) : w));
const norm = (x: unknown) => words(x).join(" ");
export const unique = <T,>(a: T[]) => [...new Set(a)];
const nkey = (d: number, key: unknown) => `${d}|${String(key || "Other study-guide topic")}`;
const stableStem = (q: ExamQuestion) => q.conceptFamily || String(q.stem || "").trim().toLowerCase().replace(/\s+/g, " ");
export const seenKey = (q: ExamQuestion) =>
  q.conceptFamily || String(q.stem || "").toLowerCase().replace(/\s+/g, " ").trim();
export const same = (q: ExamQuestion, a: unknown) =>
  Array.isArray(a) && q.correct.length === a.length && q.correct.every((x) => a.includes(x));

function overlap(a: unknown, b: unknown) {
  const wa = unique(words(a));
  const wb = new Set(words(b));
  if (!wa.length) return 0;
  return wa.filter((w) => wb.has(w)).length / wa.length;
}

type Evidence = { q: ExamQuestion; a: number[]; ok: boolean; attempt: string; at: number };

/** First-seen answer per distinct question across all submitted attempts (evidenceSamples()). */
export function evidenceSamples(exams: Exam[], db: Db) {
  const records: { ex: Exam; answers: number[][]; at: number; sort: number }[] = [];
  for (const ex of exams) {
    const h = db.history[ex.id] || [];
    const latest = db.sessions[ex.id];
    h.forEach((v, i) => {
      if (Array.isArray(v.answers) && v.answers.length === 100) records.push({ ex, answers: v.answers, at: Number(v.at) || 0, sort: i });
    });
    if (latest?.submitted && Array.isArray(latest.answers) && latest.answers.length === 100) {
      const present = h.some((v) => Array.isArray(v.answers) && Number(v.at) === Number(latest.submittedAt));
      if (!present) records.push({ ex, answers: latest.answers, at: latest.submittedAt || 0, sort: 999 });
    }
  }
  records.sort((a, b) => a.at - b.at || a.sort - b.sort);
  const firstMap = new Map<string, Evidence>();
  const all: Evidence[] = [];
  for (const attempt of records) {
    attempt.ex.questions.forEach((q, i) => {
      const a = attempt.answers[i] || [];
      const item = { q, a, ok: isCorrect(q, a), attempt: attempt.ex.id, at: attempt.at };
      all.push(item);
      const key = stableStem(q);
      if (!firstMap.has(key)) firstMap.set(key, item);
    });
  }
  return { first: [...firstMap.values()], all, records };
}

export type Resources = { exams: Exam[]; summaries: Rec[]; cases: Rec[]; redFlags: Rec[] };

export function allSummaries(summaries: Rec[]): Rec[] {
  return summaries.flatMap((d) => (d.topics as Rec[]).map((t) => ({ ...t, chapter: d.chapter })));
}

export function summaryMatch(topic: Topic, summaries: Rec[]): { item: Rec; score: number } | null {
  const a = norm(topic.label);
  const pool = allSummaries(summaries).filter((t) => t.chapter === topic.domain);
  let best: Rec | null = null;
  let score = 0;
  for (const s of pool) {
    const st = norm(s.title);
    const mutual = overlap(topic.label, s.title);
    const reverse = overlap(s.title, topic.label);
    const exact = st === a && a ? 1 : 0;
    const inclusion = a.length > 8 && st.includes(a) ? 0.95 : 0;
    const rank = Math.max(exact, inclusion, mutual * 0.75 + reverse * 0.25);
    if (rank > score) {
      best = s;
      score = rank;
    }
  }
  return best && score >= 0.49 ? { item: best, score } : null;
}

function related(topic: Topic, pool: Rec[], mode: "flags" | "cases", max: number): Rec[] {
  const anchor = topic.label;
  return pool
    .filter((x) => (mode === "flags" ? Number(x.domain?.[0]) : x.chapter) === topic.domain)
    .map((x) => {
      const title =
        mode === "flags"
          ? `${x.fraud_type} ${x.category} ${x.indicator} ${x.source_section}`
          : `${x.title} ${x.topic} ${x.signal || ""}`;
      let score = Math.max(overlap(anchor, title), overlap(title, anchor) * 0.55);
      const lower = anchor.toLowerCase();
      if (mode === "flags" && lower.includes(String(x.source_section || "").toLowerCase()) && String(x.source_section || "").length > 12)
        score = Math.max(score, 0.68);
      if (mode === "cases" && lower.includes(String(x.topic || "").toLowerCase()) && String(x.topic || "").length > 8)
        score = Math.max(score, 0.62);
      return { ...x, _score: score };
    })
    .filter((x) => x._score >= 0.24)
    .sort((a, b) => b._score - a._score)
    .slice(0, max);
}

export function gather(exams: Exam[], db: Db, state: AdaptiveState): Topic[] {
  const records = evidenceSamples(exams, db);
  const map = new Map<string, Topic>();
  const blank = (key: string, domain: number, label: string): Topic => ({
    key, domain, label, samples: 0, correct: 0, wrong: 0, questions: [], last: 0,
    accuracy: null, score: 0, isProvisional: true, status: "",
  });
  for (const row of records.first) {
    const q = row.q;
    const label = q.sourceSection || q.topic || "Unmapped topic";
    const key = nkey(q.domain, label);
    let t = map.get(key);
    if (!t) {
      t = blank(key, q.domain, label);
      map.set(key, t);
    }
    t.samples++;
    t.correct += Number(row.ok);
    t.wrong += Number(!row.ok);
    t.questions.push(q);
    t.last = Math.max(t.last, row.at || 0);
  }
  for (const item of state.quizzes) {
    let t = map.get(item.topicKey);
    if (!t) {
      const [d, ...label] = String(item.topicKey || "").split("|");
      t = blank(item.topicKey, Number(d) || 1, label.join("|") || "Reassessment topic");
      map.set(item.topicKey, t);
    }
    if (!t.quiz || item.at > t.quiz.at) t.quiz = item;
  }
  return [...map.values()].map((t) => {
    t.accuracy = t.samples ? Math.round((100 * t.correct) / t.samples) : null;
    t.score = t.samples ? 100 * (t.wrong / t.samples) + Math.min(24, t.wrong * 5) + Math.min(12, t.samples * 1.5) : 0;
    if (t.quiz) {
      if (t.quiz.percent >= 80) t.score -= 65;
      else t.score += 14;
    }
    t.isProvisional = t.samples < 3;
    t.status = t.quiz
      ? t.quiz.percent >= 80
        ? "Rechecked ≥80%"
        : "Recheck needed"
      : t.isProvisional
        ? "Provisional weakness"
        : "Revision priority";
    return t;
  });
}

export function rankedTopics(topics: Topic[]): Topic[] {
  return topics
    .filter((t) => t.wrong || (t.quiz && t.quiz.percent < 80))
    .sort((a, b) => b.score - a.score || b.wrong - a.wrong || b.samples - a.samples);
}

export function questionPool(t: Topic, exams: Exam[]): ExamQuestion[] {
  const rows: ExamQuestion[] = exams.flatMap((e) => e.questions.map((q): ExamQuestion => ({ ...q, origin: e.id })));
  const rated = rows
    .filter((q) => q.domain === t.domain)
    .map((q) => {
      const label = q.sourceSection || q.topic || "";
      let r = 0;
      if (norm(label) === norm(t.label) && norm(label)) r = 1;
      else if (label.toLowerCase() === t.label.toLowerCase()) r = 1;
      else r = Math.max(overlap(t.label, label) * 0.75 + overlap(label, t.label) * 0.25, overlap(t.label, q.topic || "") * 0.7);
      return { q, r };
    })
    .filter((x) => x.r >= 0.5)
    .sort((x, y) => y.r - x.r);
  const out: ExamQuestion[] = [];
  const used = new Set<string>();
  for (const x of rated) {
    const k = seenKey(x.q);
    if (!used.has(k)) {
      out.push(x.q);
      used.add(k);
    }
  }
  return out;
}

export function attempted(exams: Exam[], db: Db, state: AdaptiveState): Set<string> {
  const ids = new Set<string>();
  for (const e of exams) {
    const a = db.sessions[e.id];
    if (!a || !a.submitted) continue;
    e.questions.forEach((q, i) => {
      if (a.answers?.[i]?.length) ids.add(seenKey(q));
    });
  }
  for (const z of state.quizzes) for (const q of z.items || []) ids.add(q.stemKey);
  return ids;
}

export function planPath(t: Topic, r: Resources) {
  return {
    sum: summaryMatch(t, r.summaries),
    cases: related(t, r.cases, "cases", 3),
    flags: related(t, r.redFlags, "flags", 5),
    qs: questionPool(t, r.exams),
  };
}

/** Chooses up to 5 questions for a recheck, like startQuiz() did. */
export function chooseQuiz(t: Topic, r: Resources, db: Db, state: AdaptiveState): ExamQuestion[] {
  const pool = questionPool(t, r.exams);
  if (!pool.length) return [];
  const used = attempted(r.exams, db, state);
  const ordered = [...pool.filter((q) => !used.has(seenKey(q))), ...pool.filter((q) => used.has(seenKey(q)))];
  const index = state.quizzes.filter((q) => q.topicKey === t.key).length;
  let chosen = ordered.slice(0, 5);
  if (index && pool.length > 5) {
    const offset = (index * 5) % pool.length;
    chosen = pool.slice(offset).concat(pool.slice(0, offset)).slice(0, 5);
  }
  return chosen;
}

/** Hrefs into the pages that own the linked content (those pages read these query params). */
export const links = {
  summary: (id: string) => `/studio/chapterSummaries?open=${encodeURIComponent(id)}`,
  summaryModule: (d: number) => `/studio/chapterSummaries?module=${d}`,
  flag: (id: string) => `/studio/redFlags?flag=${encodeURIComponent(id)}`,
  flagModule: (d: number) => `/studio/redFlags?module=${d}`,
  caseStudy: (id: string) => `/studio/caseStudies?case=${encodeURIComponent(id)}`,
  caseModule: (d: number) => `/studio/caseStudies?module=${d}`,
};
