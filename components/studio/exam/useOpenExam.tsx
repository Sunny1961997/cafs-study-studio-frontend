"use client";

// "Open exam" behaviour of every exam card: resume / results when a saved attempt exists,
// otherwise the v16 start dialog. Render the returned `dialog` somewhere in the page.

import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { PreflightDialog } from "@/components/studio/exam/PreflightDialog";
import { setLastMode, startFreshSession } from "@/components/studio/exam/examUtils";
import { useDb, useTimerMinutes } from "@/lib/studio/db";
import { examHref, resultsHref } from "@/lib/studio/nav";
import { useStudioData } from "@/lib/studio/StudioProvider";

export function useOpenExam(): { openExam: (id: string) => void; dialog: ReactNode } {
  const router = useRouter();
  const { exams } = useStudioData();
  const [db, setDb] = useDb();
  const [, setTimer] = useTimerMinutes();
  const [pending, setPending] = useState<string | null>(null);

  const openExam = useCallback(
    (id: string) => {
      const s = db.sessions[id];
      if (s && Array.isArray(s.answers)) {
        router.push(s.submitted ? resultsHref(id) : examHref(id));
        window.scrollTo(0, 0);
        return;
      }
      setPending(id);
    },
    [db, router],
  );

  const exam = pending ? exams.find((x) => x.id === pending) : undefined;
  const dialog = exam ? (
    <PreflightDialog
      exam={exam}
      onCancel={() => setPending(null)}
      onLaunch={(minutes, mode) => {
        setTimer(minutes);
        setLastMode(mode);
        startFreshSession(exams, setDb, exam.id, minutes, mode);
        setPending(null);
        router.push(examHref(exam.id));
        window.scrollTo(0, 0);
      }}
    />
  ) : null;
  return { openExam, dialog };
}
