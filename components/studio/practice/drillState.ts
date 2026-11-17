"use client";

// In-memory focus-drill session (the original kept it in a page variable, not in storage).
// `useStartDrill()` is what Insights, Overview and the exam review call to open /studio/drill.

import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { stableStem, topicOf } from "@/components/studio/practice/helpers";
import { drillHref } from "@/lib/studio/nav";
import { useStudioData } from "@/lib/studio/StudioProvider";
import type { Exam, ExamQuestion } from "@/lib/studio/types";

export type Drill = {
  domain: number;
  topic: string;
  qs: ExamQuestion[];
  answers: number[][];
  checked: boolean[];
  current: number;
  finished: boolean;
};

let drill: Drill | null = null;
const listeners = new Set<() => void>();

export const getDrill = () => drill;
export function setDrill(next: Drill | null) {
  drill = next;
  listeners.forEach((l) => l());
}
export function useDrill(): Drill | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => drill,
    () => null,
  );
}

/** Builds a drill from the unique questions mapped to a topic (max 10). Returns false when there are none. */
export function beginTopicDrill(exams: Exam[], domain: number, topic: string): boolean {
  const unique = new Map<string, ExamQuestion>();
  for (const ex of exams) {
    for (const q of ex.questions) {
      if (q.domain !== domain || topicOf(q) !== topic) continue;
      const k = stableStem(q);
      if (!unique.has(k)) unique.set(k, q);
    }
  }
  const qs = [...unique.values()].slice(0, 10);
  if (!qs.length) {
    window.alert("No practice questions are mapped to that study-guide topic.");
    return false;
  }
  setDrill({ domain, topic, qs, answers: qs.map(() => []), checked: qs.map(() => false), current: 0, finished: false });
  return true;
}

/** Returns `(domain, topic) => void` that starts a focus drill and opens the drill screen. */
export function useStartDrill() {
  const router = useRouter();
  const { exams } = useStudioData();
  return useCallback(
    (domain: number, topic: string) => {
      if (beginTopicDrill(exams, domain, topic)) {
        router.push(drillHref());
        window.scrollTo(0, 0);
      }
    },
    [exams, router],
  );
}
