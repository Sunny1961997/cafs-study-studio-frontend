"use client";

// The v16 "Before you begin" dialog (mode + time limit) shown before a new attempt starts.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/studio/StudioProvider";
import type { Exam } from "@/lib/studio/types";

export function PreflightDialog({ exam, onCancel, onLaunch }: { exam: Exam; onCancel: () => void; onLaunch: (minutes: number, mode: string) => void }) {
  const t = useT();
  const [mode, setMode] = useState("simulation");
  const [minutes, setMinutes] = useState("120");
  const multi = exam.questions.filter((x) => x.kind === "multi").length;
  const tf = exam.questions.filter((x) => x.kind === "truefalse").length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="v16-dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="v16-dialog" role="dialog" aria-modal="true" aria-labelledby="v16DlgTitle">
        <span className="v16-eyebrow">{t("exam.pre.eyebrow", "BEFORE YOU BEGIN")}</span>
        <h2 id="v16DlgTitle">{exam.title}</h2>
        <p>
          {t(
            "exam.pre.intro",
            "Choose a mode and duration for this unofficial practice exam. Questions may include multi-select and True/False. You can save progress, flag difficult items and review explanations after submission. A running timer continues while an unfinished timed attempt is saved.",
          )}
        </p>
        <div className="v16-guide">
          <b>{t("exam.pre.profile", "Assessment profile:")}</b> {exam.questions.length} {t("exam.pre.questions", "questions")} · {multi} {t("exam.pre.multi", "multi-select")} · {tf}{" "}
          {t("exam.pre.tf", "True/False")} ·{" "}
          {exam.track === "cases"
            ? t("exam.pre.mixCases", "case-study weighting 28 / 45 / 27")
            : exam.type === "chapter"
              ? t("exam.pre.mixChapter", "one official fraud domain")
              : t("exam.pre.mixMock", "mixed domains 40 / 30 / 30")}
          .
          <br />
          <b>{t("exam.pre.scoring", "Scoring:")}</b>{" "}
          {t(
            "exam.pre.scoringText",
            "exact-match for multi-select, no partial credit. This is unofficial practice, and the selected time is a self-imposed training setting, not an ACAMS exam specification.",
          )}
        </div>
        <label>{t("exam.pre.approach", "Practice approach")}</label>
        <div className="v16-modegrid">
          <label>
            <input type="radio" name="v16Mode" value="simulation" checked={mode === "simulation"} onChange={() => setMode("simulation")} />
            <strong>{t("exam.pre.simTitle", "Exam simulation")}</strong>
            <span>{t("exam.pre.simText", "Hide study topics until you submit; timed decisions and no immediate feedback.")}</span>
          </label>
          <label>
            <input type="radio" name="v16Mode" value="guided" checked={mode === "guided"} onChange={() => setMode("guided")} />
            <strong>{t("exam.pre.guidedTitle", "Guided practice")}</strong>
            <span>{t("exam.pre.guidedText", "Show each question's fraud topic while you practise; answer keys still hidden until submission.")}</span>
          </label>
        </div>
        <label htmlFor="v16Duration">{t("exam.pre.limit", "Time limit")}</label>
        <select id="v16Duration" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
          <option value="0">{t("exam.pre.untimed", "Untimed")}</option>
          <option value="90">{t("exam.pre.m90", "90 minutes")}</option>
          <option value="120">{t("exam.pre.m120", "120 minutes (practice default)")}</option>
          <option value="150">{t("exam.pre.m150", "150 minutes")}</option>
          <option value="180">{t("exam.pre.m180", "180 minutes")}</option>
        </select>
        <div className="v16-modalactions">
          <button className="btn" onClick={onCancel}>
            {t("exam.pre.cancel", "Return to exam centre")}
          </button>
          <button className="btn btn-primary" autoFocus onClick={() => onLaunch(Number(minutes) || 0, mode)}>
            {t("exam.pre.launch", "Begin fraud assessment →")}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
