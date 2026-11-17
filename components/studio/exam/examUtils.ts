// Small shared helpers of the exam flow (session creation, review links).

import { createSession } from "@/lib/studio/engine";
import type { Db, Exam } from "@/lib/studio/types";
import { examHref } from "@/lib/studio/nav";

export type SetDb = (next: Db | ((prev: Db) => Db)) => void;

/** Practice mode picked last in the start dialog (the original kept it in a page global). */
let lastMode = "simulation";
export const getLastMode = () => lastMode;
export const setLastMode = (mode: string) => {
  lastMode = mode;
};

/** Replaces (or creates) the saved session of an exam with a fresh attempt. */
export function startFreshSession(exams: Exam[], setDb: SetDb, id: string, minutes: number, mode: string) {
  const fresh = createSession(exams, id, minutes, mode);
  setDb((prev) => ({ ...prev, sessions: { ...prev.sessions, [id]: fresh } }));
}

/** Link to the review screen: all answers, or starting on the missed questions. */
export const reviewHref = (id: string, mode: "all" | "incorrect") => `${examHref(id)}?review=${mode === "incorrect" ? "incorrect" : "1"}`;
