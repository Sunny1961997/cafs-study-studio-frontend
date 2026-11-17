"use client";

import { useMemo } from "react";
import { useStudioData } from "@/lib/studio/StudioProvider";
import type { ExamQuestion, Rec } from "@/lib/studio/types";

/** The four mocks that make up the "advanced" question bank. */
export const NEW_EXAM_IDS = ["mock-07", "mock-09", "mock-10", "mock-11"];
export const SHORT: Record<number, string> = {
  1: "Fraud Risk Management",
  2: "Fraud Detection and Analytics",
  3: "Fraud Investigations",
};
export const MOD_NAMES: Record<number, string> = {
  1: "Building a Fraud Risk Management Program",
  2: "Fraud Detection and Analytics",
  3: "Fraud Investigations",
};

export type AdvancedQuestion = ExamQuestion & { mock: string; sourceMock: string; position: number };

/** Questions of the advanced mocks, tagged with their source exam and position. */
export function useAdvancedQuestions() {
  const { exams } = useStudioData();
  return useMemo(() => {
    const advanced = exams.filter((x) => NEW_EXAM_IDS.includes(x.id));
    const questions: AdvancedQuestion[] = advanced.flatMap((e) =>
      e.questions.map((q, i) => ({ ...q, mock: e.id, sourceMock: e.short, position: i + 1 })),
    );
    return { advanced, questions };
  }, [exams]);
}

export const esc = (s: unknown) => String(s ?? "");
export const uniq = (a: string[]) => [...new Set(a)].sort((x, y) => x.localeCompare(y));
export const flagDomain = (x: Rec) => Number(String(x.domain)[0]);

/** Tab strip of the three CAFS modules (optionally with an "All" tab). */
export function ModuleTabs({
  selected,
  onSelect,
  all = false,
  allLabel = "All three modules",
}: {
  selected: number;
  onSelect: (n: number) => void;
  all?: boolean;
  allLabel?: string;
}) {
  return (
    <div className="v14-tabs">
      {all ? (
        <button className={`v14-tab ${selected === 0 ? "selected" : ""}`} onClick={() => onSelect(0)}>
          {allLabel}
        </button>
      ) : null}
      {[1, 2, 3].map((d) => (
        <button key={d} className={`v14-tab ${selected === d ? "selected" : ""}`} onClick={() => onSelect(d)}>
          Module {d} · {SHORT[d]}
        </button>
      ))}
    </div>
  );
}
