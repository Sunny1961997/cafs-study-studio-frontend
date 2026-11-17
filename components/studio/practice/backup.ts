// Downloads, CSV helpers and progress backup/restore (ported from the original page).

import { DB_KEY, archiveChangedBanks, isCorrect, letter, parseDb } from "@/lib/studio/engine";
import { getItem, setItem } from "@/lib/studio/store";
import type { Db, Exam, Session } from "@/lib/studio/types";

export const SPRINT_STORE = "cafs_exam_sprint_final_v1";
export const ADAPTIVE_KEY = "cafs_studio_v15_adaptive_learning";

export const csvCell = (s: unknown) => '"' + String(s ?? "").replace(/"/g, '""') + '"';

export function downloadBlob(blob: Blob, filename: string, revokeAfter = 1500) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), revokeAfter);
}

/** CSV of a submitted exam session ("Download results CSV"). */
export function downloadResultsCsv(exam: Exam, session: Session | undefined | null) {
  if (!session?.submitted) return;
  const rows: unknown[][] = [["Question ID", "Domain", "Study guide topic", "Type", "Outcome", "Your selection", "Correct selection", "Question", "Explanation"]];
  exam.questions.forEach((q, i) =>
    rows.push([
      q.id,
      q.domain,
      q.sourceSection || q.topic,
      q.kind,
      isCorrect(q, session.answers[i]) ? "Correct" : session.answers[i]?.length ? "Incorrect" : "Skipped",
      (session.answers[i] || []).map(letter).join("|"),
      q.correct.map(letter).join("|"),
      q.stem,
      q.explanation,
    ]),
  );
  const blob = new Blob(["﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `CAFS_${exam.id}_results.csv`);
}

function readJSON(key: string): unknown {
  try {
    return JSON.parse(getItem(key) || "null");
  } catch {
    return null;
  }
}

/** Downloads every kind of saved progress (exam db, supplemental drills, adaptive path). */
export function downloadBackup() {
  const sprintStorage = readJSON(SPRINT_STORE) || { sessions: {}, history: [], settings: { module: "2", size: 25, timer: 0, mode: "exam" } };
  const payload = {
    app: "CAFS Study Studio",
    version: 41,
    exportedAt: new Date().toISOString(),
    data: parseDb(getItem(DB_KEY)),
    sprintData: sprintStorage,
    adaptiveData: readJSON(ADAPTIVE_KEY),
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "CAFS_Exam_Sprint_All_Progress_Backup.json", 1600);
}

const validScore = (v: { score?: unknown } | null) => typeof v?.score === "number" && v.score >= 0 && v.score <= 100;

/** Restores a backup file. `onRestored` runs after a successful restore (the page goes back to the overview). */
export async function restoreBackup(file: File | undefined | null, exams: Exam[], onRestored?: () => void) {
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    if (raw.app !== "CAFS Study Studio" || raw.version !== 41 || typeof raw.data?.sessions !== "object") throw Error("Unrecognized or invalid backup file");
    if (!window.confirm("Restore progress from this backup? This replaces progress currently saved in the unified exam platform.")) return;
    const restored: Db = { sessions: {}, history: {}, drills: Array.isArray(raw.data.drills) ? raw.data.drills : [] };
    for (const ex of exams) {
      const obj = raw.data.sessions[ex.id];
      if (obj && Array.isArray(obj.answers) && obj.answers.length === 100 && Array.isArray(obj.flags) && obj.flags.length === 100) restored.sessions[ex.id] = obj;
      const h = raw.data.history?.[ex.id];
      if (Array.isArray(h)) restored.history[ex.id] = h.filter(validScore);
    }
    for (const [key, obj] of Object.entries(raw.data.sessions || {}) as [string, Session][]) {
      if (/-legacy-v\d+$/.test(key) && obj && Array.isArray(obj.answers) && obj.answers.length === 100) restored.sessions[key] = obj;
    }
    for (const [key, h] of Object.entries(raw.data.history || {}) as [string, Db["history"][string]][]) {
      if (/-legacy-v\d+$/.test(key) && Array.isArray(h)) restored.history[key] = h.filter(validScore);
    }
    setItem(DB_KEY, JSON.stringify(archiveChangedBanks(exams, restored)));
    if (raw.sprintData?.sessions) setItem(SPRINT_STORE, JSON.stringify(raw.sprintData));
    const a = raw.adaptiveData;
    if (a && Array.isArray(a.quizzes) && a.steps && typeof a.steps === "object") setItem(ADAPTIVE_KEY, JSON.stringify({ quizzes: a.quizzes.slice(-150), steps: a.steps }));
    onRestored?.();
    window.alert("Your saved progress has been restored.");
  } catch (e) {
    window.alert("Could not restore this backup: " + (e as Error).message);
  }
}

/** Clears the adaptive-path state (part of "Clear all unified progress"). */
export function resetAdaptiveState() {
  setItem(ADAPTIVE_KEY, JSON.stringify({ steps: {}, quizzes: [] }));
}
