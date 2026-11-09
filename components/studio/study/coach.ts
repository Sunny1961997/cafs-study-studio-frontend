import { isCorrect } from "@/lib/studio/engine";
import type { Db, Exam, Rec } from "@/lib/studio/types";

export const COACH_KEY = "cafs_exam_coach_v7";
export const DEFAULT_EXAM_DATE = "2026-10-31";
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type CoachState = { date: string; done: Record<string, boolean> };
export const COACH_FALLBACK: CoachState = { date: DEFAULT_EXAM_DATE, done: {} };

export function normaliseCoach(raw: unknown): CoachState {
  const old = raw && typeof raw === "object" ? (raw as Rec) : null;
  if (!old) return COACH_FALLBACK;
  return { date: typeof old.date === "string" && DATE_RE.test(old.date) ? old.date : DEFAULT_EXAM_DATE, done: old.done || {} };
}

export function daysLeft(date: string): number {
  const d = Date.parse(`${date}T00:00:00+06:00`);
  return Math.max(0, Math.ceil((d - Date.now()) / 86400000));
}

const stableStem = (q: Rec) => q.conceptFamily || String(q.stem || "").trim().toLowerCase().replace(/\s+/g, " ");

export type DomainStat = { domain: number; correct: number; total: number };

/** First-seen accuracy per domain from every saved core-exam attempt (evidenceSamples + aggregateKnowledge). */
export function firstSeenDomains(exams: Exam[], db: Db): DomainStat[] {
  type Attempt = { ex: Exam; answers: number[][]; at: number; sort: number };
  const records: Attempt[] = [];
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
  const first = new Map<string, { q: Exam["questions"][number]; ok: boolean }>();
  for (const attempt of records) {
    attempt.ex.questions.forEach((q, i) => {
      const key = stableStem(q);
      if (!first.has(key)) first.set(key, { q, ok: isCorrect(q, attempt.answers[i] || []) });
    });
  }
  const domains = new Map<number, DomainStat>([1, 2, 3].map((d) => [d, { domain: d, correct: 0, total: 0 }]));
  first.forEach(({ q, ok }) => {
    const d = domains.get(q.domain);
    if (!d) return;
    d.total++;
    d.correct += Number(ok);
  });
  return [...domains.values()];
}
