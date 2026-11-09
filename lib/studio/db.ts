"use client";

import { useCallback, useMemo } from "react";
import { DB_KEY, TIMER_KEY, DEFAULT_TIMER_MINUTES, parseDb } from "@/lib/studio/engine";
import { getItem, setItem, useStoredString } from "@/lib/studio/store";
import type { Db } from "@/lib/studio/types";

/** Learner db (sessions, history, drills) with a write-through setter. */
export function useDb(): [Db, (next: Db | ((prev: Db) => Db)) => void] {
  const raw = useStoredString(DB_KEY);
  const db = useMemo(() => parseDb(raw), [raw]);
  const set = useCallback((next: Db | ((prev: Db) => Db)) => {
    const resolved = typeof next === "function" ? next(parseDb(getItem(DB_KEY))) : next;
    setItem(DB_KEY, JSON.stringify(resolved));
  }, []);
  return [db, set];
}

/** Exam time limit in minutes (0 = untimed), as chosen by the learner. */
export function useTimerMinutes(): [number, (minutes: number) => void] {
  const raw = useStoredString(TIMER_KEY);
  const minutes = raw === null ? DEFAULT_TIMER_MINUTES : Number(raw) || 0;
  const set = useCallback((value: number) => setItem(TIMER_KEY, String(Number(value) || 0)), []);
  return [minutes, set];
}
