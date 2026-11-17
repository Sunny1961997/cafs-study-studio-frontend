// Pure assessment engine ported from the studio HTML (readDb, createSession,
// isComplete/isCorrect, doneCount/scoreCount, getStats and the v17–v20 archive migrations).
// Everything is a function of (exams, db): no globals, no DOM, no storage.

import type { Db, Exam, ExamQuestion, Rec, Session } from "@/lib/studio/types";

export const DB_KEY = "cafs_studio_v4_draft_600";
export const TIMER_KEY = "cafs_studio_timer";
export const DEFAULT_TIMER_MINUTES = 175;

export const TITLES: Record<number, string> = {
  1: "Building a Fraud Risk Management Program",
  2: "Fraud Detection and Analytics",
  3: "Fraud Investigations",
};

export const emptyDb = (): Db => ({ sessions: {}, history: {}, drills: [] });

/** Parses the stored db string the way readDb() did. */
export function parseDb(raw: string | null): Db {
  try {
    const d = JSON.parse(raw || "{}");
    return {
      sessions: d.sessions || {},
      history: d.history || {},
      drills: Array.isArray(d.drills) ? d.drills : [],
    };
  } catch {
    return emptyDb();
  }
}

export const isComplete = (q: ExamQuestion, a: unknown) => Array.isArray(a) && a.length === q.correct.length;
export const isCorrect = (q: ExamQuestion, a: unknown) =>
  Array.isArray(a) && a.length === q.correct.length && a.every((x) => q.correct.includes(x));

export const doneCount = (exam: Exam, session?: Session | null) =>
  exam.questions.reduce((n, q, i) => n + (isComplete(q, session?.answers?.[i]) ? 1 : 0), 0);
export const scoreCount = (exam: Exam, session?: Session | null) =>
  exam.questions.reduce((n, q, i) => n + (isCorrect(q, session?.answers?.[i]) ? 1 : 0), 0);

export function getStats(exams: Exam[], db: Db) {
  const completed = exams.filter((x) => db.sessions[x.id]?.submitted);
  const answerCount = exams.reduce((n, x) => n + doneCount(x, db.sessions[x.id]), 0);
  const best = completed.length ? Math.max(...completed.map((e) => db.sessions[e.id].score ?? 0)) : null;
  return { completed: completed.length, answerCount, best };
}

/** Revision tag stored on a session so a changed question bank archives old attempts. */
export function bankRevision(id: string): string | null {
  if (id === "chapter-3") return "v17-domain3";
  if (id === "chapter-1" || id === "chapter-2") return "v18-domain12";
  if (id === "mock-1") return "v19-independent-forms";
  if (id === "mock-2" || id === "mock-3") return "v20-editorial-116";
  return null;
}

export function createSession(exams: Exam[], id: string, timerMinutes: number, mode = "simulation"): Session {
  const exam = exams.find((x) => x.id === id)!;
  const t = Date.now();
  return {
    answers: exam.questions.map(() => []),
    flags: exam.questions.map(() => false),
    current: 0,
    submitted: false,
    startedAt: t,
    endAt: timerMinutes ? t + timerMinutes * 60000 : null,
    timeLimit: timerMinutes,
    simulationMode: mode,
    questionBankRevision: bankRevision(id),
    score: null,
  };
}

// Positions of mock-2 / mock-3 questions edited in v20 (their old answers are not reused).
const V20_CHANGED_POSITIONS: Record<string, number[]> = {
  "mock-2": [1, 3, 4, 7, 9, 13, 14, 16, 18, 19, 23, 25, 26, 27, 31, 32, 33, 34, 35, 37, 41, 44, 46, 50, 51, 54, 55, 57, 58, 60, 62, 63, 65, 68, 70, 73, 75, 76, 78, 79, 80, 82, 84, 85, 86, 87, 89, 90, 91, 94, 96, 98],
  "mock-3": [2, 4, 5, 8, 11, 12, 13, 15, 17, 18, 19, 22, 23, 24, 26, 28, 29, 30, 31, 34, 35, 37, 38, 39, 40, 42, 44, 45, 47, 48, 49, 51, 52, 53, 56, 57, 58, 59, 60, 63, 65, 66, 68, 69, 70, 71, 72, 73, 77, 79, 80, 81, 82, 83, 85, 86, 87, 89, 90, 92, 93, 95, 96, 98],
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Archives attempts made against an older version of a question bank (v17 Domain 3,
 * v18 Domains 1–2, v19/v20 Forms A–C). Returns the same object when nothing changed.
 */
export function archiveChangedBanks(exams: Exam[], db: Db, timerMinutes = DEFAULT_TIMER_MINUTES): Db {
  const next: Db = clone(db);
  let changed = false;

  // v17: Domain 3
  const c3 = next.sessions["chapter-3"];
  if (c3 && c3.questionBankRevision !== "v17-domain3") {
    if (!next.sessions["chapter-3-legacy-v16"]) next.sessions["chapter-3-legacy-v16"] = c3;
    delete next.sessions["chapter-3"];
    next.history["chapter-3-legacy-v16"] = next.history["chapter-3-legacy-v16"] || next.history["chapter-3"] || [];
    delete next.history["chapter-3"];
    changed = true;
  }

  // v19 / v20: Forms A–C
  for (const id of ["mock-1", "mock-2", "mock-3"]) {
    const sess = next.sessions[id];
    if (!sess) continue;
    const target = id === "mock-1" ? "v19-independent-forms" : "v20-editorial-116";
    if (sess.questionBankRevision === target) continue;
    const priorVersion = sess.questionBankRevision === "v19-independent-forms" ? "v19" : "pre-v19";
    const key = `${id}-archived-${priorVersion}-v20`;
    if (!next.sessions[key]) next.sessions[key] = clone(sess);
    if (Array.isArray(next.history[id]) && next.history[id].length) {
      if (!next.history[key]) next.history[key] = clone(next.history[id]);
      delete next.history[id];
    }
    if (id !== "mock-1" && priorVersion === "v19" && Array.isArray(sess.answers) && sess.answers.length === 100) {
      const revised = createSession(exams, id, timerMinutes);
      const changedAt = new Set(V20_CHANGED_POSITIONS[id] || []);
      for (let j = 0; j < 100; j++) {
        if (changedAt.has(j)) continue;
        revised.answers[j] = Array.isArray(sess.answers[j]) ? [...sess.answers[j]] : [];
        revised.flags[j] = Array.isArray(sess.flags) ? !!sess.flags[j] : false;
      }
      revised.current = Math.max(0, Math.min(99, Number(sess.current) || 0));
      revised.provenance = "migrated-unchanged-answers-only";
      next.sessions[id] = revised;
    } else delete next.sessions[id];
    changed = true;
  }

  // v18: Domains 1–2
  for (const id of ["chapter-1", "chapter-2"]) {
    const sess = next.sessions[id];
    if (sess && sess.questionBankRevision !== "v18-domain12") {
      const legacyKey = `${id}-legacy-v17`;
      if (!next.sessions[legacyKey]) next.sessions[legacyKey] = sess;
      delete next.sessions[id];
      const oldHist = next.history[id];
      if (Array.isArray(oldHist) && oldHist.length) {
        if (!next.history[legacyKey]) next.history[legacyKey] = oldHist;
        delete next.history[id];
      }
      changed = true;
    }
  }

  return changed ? next : db;
}

/**
 * Imports quiz saves written by the older single-file builds (cafs_v103_*_saves_v1),
 * only for exams that have no session yet. `read` returns a stored string for a key.
 */
export function importLegacySaves(db: Db, read: (key: string) => string | null): Db {
  const next: Db = clone(db);
  let changed = false;
  const importRecord = (raw: Rec | null, key: string) => {
    if (next.sessions[key] || (key === "chapter-3" && next.sessions["chapter-3-legacy-v16"]) || !raw || !Array.isArray(raw.answers) || raw.answers.length !== 100) return;
    next.sessions[key] = {
      ...raw,
      answers: raw.answers.map((x: unknown) => (Array.isArray(x) ? x : [])),
      flags: Array.isArray(raw.flags) ? raw.flags : Array(100).fill(false),
      current: raw.current || 0,
    } as Session;
    if (raw.submitted && Number.isFinite(raw.score) && !(next.history[key] || []).length) {
      next.history[key] = [{ score: raw.score, at: raw.submittedAt || Date.now() }];
    }
    changed = true;
  };
  try {
    [["cafs_v103_chapter_1_saves_v1", "chapter-1"], ["cafs_v103_chapter_2_saves_v1", "chapter-2"], ["cafs_v103_chapter_3_saves_v1", "chapter-3"]].forEach(([k, id]) => {
      const saves = JSON.parse(read(k) || "{}");
      importRecord(saves[0], id);
    });
    const mocks = JSON.parse(read("cafs_v103_advanced_bank_saves_v1") || "{}");
    for (let i = 0; i < 3; i++) importRecord(mocks[i], `mock-${i + 1}`);
  } catch {
    /* ignore corrupt legacy saves */
  }
  return changed ? next : db;
}

/** Formats milliseconds as MM:SS, or "Untimed". */
export function stamp(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "Untimed";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const letter = (i: number) => "ABCDEF"[i];
